import { clamp, lerp } from '@rubickjs/math'
import { Node, customNode, property } from '@rubickjs/core'
import { getDefaultCssPropertyValue, parseCssProperty } from '@rubickjs/shared'
import { timingFunctions } from './timingFunction'
import type { CssFunction, CssFunctionArg } from '@rubickjs/shared'
import type { TimingFunctions } from './timingFunction'

export interface Keyframe {
  easing?: keyof TimingFunctions
  offset?: number
  [property: string]: string | number | null | undefined
}

export interface NormalizedKeyframe {
  easing: (amount: number) => number
  offset: number
  props: Record<string, any>
}

export interface AnimationProperties {
  mode?: 'parent' | 'sibling'
  startTime?: number
  duration?: number
  loop?: boolean
  keyframes?: Array<Keyframe>
}

@customNode('animation')
export class Animation extends Node {
  @property({ default: 'parent' }) declare mode: 'parent' | 'sibling'
  @property({ default: false }) declare loop: boolean
  @property({ default: [] }) declare keyframes: Array<Keyframe>
  @property({ default: 0 }) declare startTime: number
  @property({ default: 2000 }) declare duration: number

  protected _keyframes: Array<NormalizedKeyframe> = []
  protected _starting = false
  protected _startingProps = new WeakMap<any, Map<string, any>>()

  constructor(properties: AnimationProperties = {}) {
    super()
    this.setProperties(properties)
  }

  protected override _enterTree() {
    this._tree?.timeline.on('update', this._onUpdateTime.bind(this))
    this._updateStartingProps()
  }

  protected override _exitTree() {
    this._tree?.timeline.off('update', this._onUpdateTime.bind(this))
    this.cancel()
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateProperty(key, value, oldValue)
    switch (key) {
      case 'mode':
      case 'keyframes':
        this._updateKeyframes()
        break
    }
  }

  protected _getTargets(): Array<any> {
    switch (this.mode) {
      case 'sibling':
        return this.getParent()?.getChildren(true).filter(val => val !== this) ?? []
      case 'parent':
      default:
        return [this.getParent()].filter(Boolean)
    }
  }

  protected _updateKeyframes() {
    const keyframes: Array<NormalizedKeyframe> = []
    const items = this.keyframes
    for (let len = items.length, i = 0; i < len; i++) {
      const {
        offset = i === 0 ? 0 : i / (len - 1),
        easing = 'linear',
        ...props
      } = items[i]
      keyframes.push({
        offset,
        easing: this._parseEasing(easing),
        props,
      })
    }
    const first = keyframes[0]
    const last = keyframes[keyframes.length - 1]
    if (first && first.offset !== 0) {
      keyframes.unshift({
        offset: 0,
        easing: this._parseEasing('linear'),
        props: {},
      })
    }
    if (last && last.offset !== 1) {
      keyframes.push({
        offset: 1,
        easing: this._parseEasing('linear'),
        props: {},
      })
    }
    this._keyframes = keyframes
    this._updateStartingProps()
  }

  protected _onUpdateTime(currentTime: number): void {
    currentTime = this._normalizeCurrentTime(currentTime)

    if ((currentTime < 0 || currentTime > 1)) {
      if (!this._starting) return
      currentTime = clamp(0, currentTime, 1)
      this._starting = false
    } else if (!this._starting) {
      this._starting = true
      this._updateStartingProps()
    }

    const targets = this._getTargets()
    const offset = 1 / targets.length

    targets.forEach((target, i) => {
      const tiem = offset === 1
        ? currentTime
        : clamp(0, Math.max(0, currentTime - offset * i) / offset, 1)
      const startingProps = this._startingProps.get(target)
      if (!startingProps) return
      const keyframes = this._parseKeyframes(tiem, startingProps)
      if (!keyframes) return
      this._commitStyles(tiem, target, startingProps, keyframes[0], keyframes[1])
    })
  }

  protected _updateStartingProps() {
    this.cancel()
    this._getTargets().forEach(target => {
      const startingProps = new Map<string, any>()
      const keyframes = this._keyframes
      for (let len = keyframes.length, i = 0; i < len; i++) {
        Object.keys(keyframes[i].props).forEach(name => {
          startingProps.set(name, (target as any)[name])
        })
      }
      this._startingProps.set(target, startingProps)
    })
  }

  protected _normalizeCurrentTime(currentTime: number): number {
    const startTime = (this.getParent()?.visibleStartTime ?? 0) + this.startTime
    currentTime = (currentTime - startTime) / this.duration
    if (this.loop) {
      currentTime = currentTime % 1
    }
    return currentTime
  }

  protected _parseEasing(easing: keyof TimingFunctions | undefined) {
    return (easing ? timingFunctions[easing] : undefined) ?? timingFunctions.linear
  }

  protected _parseKeyframes(currentTime: number, startingProps: Map<string, any>): [NormalizedKeyframe, NormalizedKeyframe] | null {
    let previous: NormalizedKeyframe | undefined
    const keyframes = this._keyframes
    for (let len = keyframes.length, i = 0; i < len; i++) {
      const current = keyframes[i]
      const {
        offset: currentOffset,
        easing: currentEasing,
      } = current
      const currentProps = { ...current.props }
      if (previous && currentTime <= currentOffset) {
        const {
          offset: previousOffset,
          easing: previousEasing,
        } = previous
        const previousProps = { ...previous.props }
        startingProps.forEach((value, key) => {
          if (!(key in previousProps) || previousProps[key] === null) previousProps[key] = value
          if (!(key in currentProps) || currentProps[key] === null) currentProps[key] = value
        })
        return [
          { offset: previousOffset, easing: previousEasing, props: previousProps },
          { offset: currentOffset, easing: currentEasing, props: currentProps },
        ]
      }
      previous = current
    }
    return null
  }

  protected _commitStyles(
    currentTime: number,
    target: any,
    startingProps: Map<string, any>,
    previous: NormalizedKeyframe,
    current: NormalizedKeyframe,
  ): void {
    const { offset: previousOffset, easing, props: previousProps } = previous
    const { offset, props: currentProps } = current

    const total = offset - previousOffset
    const weight = easing((currentTime - previousOffset) / total)
    const context = {
      width: target.width,
      height: target.height,
      fontSize: target.fontSize,
    }

    startingProps.forEach((_, name) => {
      target[name] = this._getDiffValue(
        name,
        previousProps[name],
        currentProps[name],
        weight,
        context,
      )
    })
  }

  protected _getDiffValue(
    name: string,
    previous: string | undefined,
    current: string | undefined,
    weight: number,
    context: Record<string, any>,
  ): any {
    let from: CssFunctionArg | Array<CssFunction>
    let to: CssFunctionArg | Array<CssFunction>
    if (previous === undefined || current === undefined) {
      if (previous !== undefined) {
        from = parseCssProperty(name, String(previous), context)
        to = getDefaultCssPropertyValue(from)
      } else if (current !== undefined) {
        to = parseCssProperty(name, String(current), context)
        from = getDefaultCssPropertyValue(to)
      } else {
        return undefined
      }
    } else {
      from = parseCssProperty(name, String(previous), context)
      to = parseCssProperty(name, String(current), context)
    }
    if (Array.isArray(from) && Array.isArray(to)) {
      const names = new Set<string>()
      const _from: Record<string, Array<CssFunctionArg>> = {}
      const _to: Record<string, Array<CssFunctionArg>> = {}
      from.forEach(({ name, args }) => {
        _from[name] = args
        names.add(name)
      })
      to.forEach(({ name, args }) => {
        _to[name] = args
        names.add(name)
      })
      let value = ''
      names.forEach(name => {
        const length = Math.max(_from[name]?.length ?? 0, _to[name]?.length ?? 0)
        const fromArgs = _from[name]
        const toArgs = _to[name]
        value += `${ name }(${
          Array.from({ length }, (_, i) => {
            const fromArg = fromArgs?.[i]
            const toArg = toArgs?.[i]
            const from = fromArg?.normalizedIntValue ?? 0
            const to = toArg?.normalizedIntValue ?? 0
            return isNaN(from) || isNaN(to)
              ? (toArg?.value ?? 0)
              : lerp(from, to, weight)
          })
            .join(', ')
        }) `
      })
      return value
    } else if (!Array.isArray(from) && !Array.isArray(to)) {
      return isNaN(from.normalizedIntValue) || isNaN(to.normalizedIntValue)
        ? to.value
        : lerp(from.normalizedIntValue, to.normalizedIntValue, weight)
    }
  }

  cancel(): void {
    this._getTargets().forEach(target => {
      this._startingProps.get(target)?.forEach((value, key) => {
        (target as any)[key] = value
      })
      this._startingProps.delete(target)
    })
  }
}

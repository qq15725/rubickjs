import { lerp } from '@rubickjs/math'
import { Node } from '@rubickjs/core'
import { parseCssProperty } from '@rubickjs/shared'
import { timingFunctions } from './timingFunction'

export interface Keyframe {
  easing?: keyof typeof timingFunctions
  offset?: number
  [property: string]: string | number | null | undefined
}

export interface NormalizedKeyframe {
  easing: (amount: number) => number
  offset: number
  props: Record<string, any>
}

export interface AnimationOptions {
  startTime?: number
  duration?: number
  loop?: boolean
  keyframes: Array<Keyframe>
}

export class Animation extends Node {
  loop!: boolean
  keyframes!: Array<Keyframe>

  constructor(options: AnimationOptions) {
    super()
    this.visibleStartTime = options.startTime ?? 0
    this.visibleDuration = options.duration ?? 2000
    this.loop = options.loop ?? false
    this.keyframes = options.keyframes
  }

  protected override _enterTree() {
    this._tree?.timeline.on('update', this._onUpdateTime)
  }

  protected override _exitTree() {
    this._tree?.timeline.off('update', this._onUpdateTime)
  }

  protected _onUpdateTime = (currentTime: number) => {
    currentTime = (currentTime - this.visibleStartTime) / this.visibleDuration

    if (this.loop) {
      currentTime = currentTime % 1
    }

    if (currentTime < 0 || currentTime > 1) {
      return
    }

    const keyframes = this._parseKeyframes(currentTime)

    if (!keyframes) {
      return
    }

    const [previous, current] = keyframes

    if (this._children.length > 0) {
      for (let len = this._children.length, i = 0; i < len; i++) {
        this._commitStyles(this._children[i], currentTime, previous, current)
      }
    } else if (this.getParent()) {
      this._commitStyles(this.getParent(), currentTime, previous, current)
    }
  }

  protected _parseKeyframes(currentTime: number): [NormalizedKeyframe, NormalizedKeyframe] | null {
    let previous: Keyframe | undefined
    for (let len = this.keyframes.length, i = 0; i < len; i++) {
      const current = this.keyframes[i]

      const {
        offset = i / (len - 1),
        easing = 'linear',
        ...props
      } = current

      if (previous && currentTime < offset) {
        const {
          offset: previousOffset = ((i - 1) / (len - 1)),
          easing: previousEasing = 'linear',
          ...previousProps
        } = previous

        return [
          { offset: previousOffset, easing: timingFunctions[previousEasing] ?? timingFunctions.linear, props: previousProps },
          { offset, easing: timingFunctions[easing] ?? timingFunctions.linear, props },
        ]
      }

      previous = current
    }
    return null
  }

  protected _commitStyles(
    target: any,
    currentTime: number,
    previous: NormalizedKeyframe,
    current: NormalizedKeyframe,
  ): void {
    const { offset: previousOffset, easing, props: previousProps } = previous
    const { offset, props: currentProps } = current

    const total = offset - previousOffset
    const weight = easing((currentTime - previousOffset) / total)

    for (const key in previousProps) {
      const from = parseCssProperty(String(previousProps[key]))
      const to = parseCssProperty(String(currentProps[key]))
      if (!Array.isArray(from) && !Array.isArray(to)) {
        target.style[key] = lerp(from.normalized, to.normalized, weight)
      } else if (Array.isArray(from) && Array.isArray(to)) {
        const fromFuncs: Record<string, any> = {}
        from.forEach(({ name, args }) => fromFuncs[name] = args)
        let value = ''
        to.forEach(({ name, args }) => {
          const fromFunc = fromFuncs[name]
          if (!fromFunc) {
            return
          }
          value += `${ name }(${ args.map((arg, i) => {
            return `${ lerp(fromFunc[i].value, arg.value, weight) }${ arg.unit ?? '' }`
          }).join(', ') }) `
        })
        target.style[key] = value
      }
    }
  }
}

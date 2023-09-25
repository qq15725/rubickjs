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
  startTime!: number
  duration!: number
  loop!: boolean
  keyframes!: Array<Keyframe>

  protected _startStyle?: Record<string, any>

  constructor(options: AnimationOptions) {
    super()
    this.startTime = options.startTime ?? 0
    this.duration = options.duration ?? 2000
    this.loop = options.loop ?? false
    this.keyframes = options.keyframes
  }

  protected _process(delta: number) {
    super._process(delta)

    let enabled = false
    if (this.isVisible()) {
      const parent = this.getParent()
      if (parent && 'style' in parent) {
        let currentTime = this._tree?.timeline.currentTime ?? 0
        currentTime = (currentTime + this.startTime) / this.duration
        if (this.loop) currentTime = currentTime % 1
        if (currentTime >= 0 && currentTime <= 1) {
          const keyframes = this._parseKeyframes(currentTime)
          if (keyframes) {
            if (!this._startStyle) this._startStyle = (parent.style as any).toObject()
            const [previous, current] = keyframes
            this._commitStyles(parent, currentTime, previous, current)
            enabled = true
          }
        }
      }
    }

    if (!enabled && this._startStyle) {
      const style = this._startStyle
      this._startStyle = undefined
      const parent = this.getParent()
      if (!parent) return
      (parent as any).style = style
    }
  }

  protected _onUpdateTime(): void {
    const parent = this.getParent()
    if (!parent) return
    const currentTime = this.visibleProgress
    const keyframes = this._parseKeyframes(currentTime)
    if (!keyframes) return
    const [previous, current] = keyframes
    this._commitStyles(parent, currentTime, previous, current)
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

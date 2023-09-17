import { lerp } from '@rubickjs/math'
import { Node } from '@rubickjs/core'
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

  constructor(options: AnimationOptions) {
    super()
    this.startTime = options.startTime ?? 0
    this.duration = options.duration ?? 2000
    this.loop = options.loop ?? false
    this.keyframes = options.keyframes
  }

  protected _enterTree() {
    this._tree?.timeline.on('update', this._onUpdateTime)
  }

  protected _exitTree() {
    this._tree?.timeline.off('update', this._onUpdateTime)
  }

  protected _onUpdateTime = (currentTime: number) => {
    currentTime = (currentTime - this.startTime) / this.duration

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

    if (this.childNodes.length > 0) {
      for (let len = this.childNodes.length, i = 0; i < len; i++) {
        this._commitStyles(this.childNodes[i], currentTime, previous, current)
      }
    } else if (this.parentNode) {
      this._commitStyles(this.parentNode, currentTime, previous, current)
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
    const weight = (currentTime - previousOffset) / total

    for (const key in previousProps) {
      const from = Number(previousProps[key] ?? 0)
      const to = Number(currentProps[key] ?? 1)
      target.style[key] = lerp(from, to, easing(weight))
    }
  }
}

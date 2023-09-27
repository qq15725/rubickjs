import { clamp } from '@rubickjs/math'
import { defineProps } from '@rubickjs/shared'
import { Sprite } from './Sprite'
import type { Texture } from '@rubickjs/core'

export interface AnimatedSpriteFrame {
  duration: number
  texture: Texture
}

export interface AnimatedSprite {
  frames: Array<AnimatedSpriteFrame>
}

@defineProps({
  frames: { internal: '_frames', onUpdated: '_onUpdateFrames' },
})
export class AnimatedSprite extends Sprite {
  protected _frames: Array<AnimatedSpriteFrame> = []
  protected _duration = 0
  get duration() { return this._duration }

  protected _onUpdateFrames() {
    this.updateDuration()
  }

  updateDuration() {
    this._duration = this._frames.reduce((duration, frame) => frame.duration + duration, 0)
  }

  updateFrame(): void {
    let currentTime = (this._tree?.timeline.currentTime ?? 0) - this.visibleStartTime

    if (currentTime < 0) {
      return
    }

    currentTime = this._duration ? currentTime % this._duration : 0
    const frames = this._frames
    const len = frames.length

    let index = len - 1
    for (let time = 0, i = 0; i < len; i++) {
      time += frames[i]?.duration ?? 0
      if (time >= currentTime) {
        index = i
        break
      }
    }

    const frame = this._frames[clamp(0, index, len - 1)]
    if (frame) {
      this.texture = frame.texture
    }
  }

  protected override _process(delta: number) {
    super._process(delta)
    this.updateFrame()
  }
}

import { Assets } from '@rubickjs/assets'
import { VideoTexture } from '@rubickjs/core'
import { Sprite } from './Sprite'

export class Video extends Sprite<VideoTexture> {
  protected _srcLoad?: Promise<this>
  protected _src!: string
  get src() { return this._src }
  set src(val) {
    if (this._src !== val) {
      this._src = val
      this.load(true)
    }
  }

  constructor(src = '') {
    super()
    this.src = src
  }

  async load(force = false): Promise<this> {
    const src = this._src

    if (!src) {
      return this
    }

    if (force || !this._srcLoad) {
      this._srcLoad = Assets.load(src).then(texture => {
        this._srcLoad = undefined
        if (src === this._src && texture instanceof VideoTexture) {
          this.texture = texture
        }
        return this
      })
    }

    return this._srcLoad
  }

  updateVideoCurrentTime(): void {
    let currentTime = (this._tree?.timeline.currentTime ?? 0) - this.visibleStartTime

    if (currentTime < 0) {
      return
    }

    const texture = this._texture
    const duration = texture.duration

    currentTime = duration
      ? currentTime % (duration * 1000)
      : 0

    if (!texture.isPlaying && !texture.seeking) {
      currentTime = ~~currentTime / 1000
      if (texture.currentTime !== currentTime) {
        texture.currentTime = currentTime
      }
    }
  }

  protected override _process(delta: number) {
    this.updateVideoCurrentTime()
    super._process(delta)
  }
}

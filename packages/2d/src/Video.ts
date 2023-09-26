import { Assets } from '@rubickjs/assets'
import { VideoTexture } from '@rubickjs/core'
import { defineProxiedProp } from '@rubickjs/shared'
import { Sprite } from './Sprite'
import type { Node2DStyle } from './Node2DStyle'

export class Video extends Sprite<VideoTexture> {
  protected _srcLoad?: Promise<this>
  protected _src!: string
  @defineProxiedProp({ on: '_onUpdateSrc' })
  public src!: string

  constructor(
    src = '',
    style?: Partial<Node2DStyle>,
  ) {
    super()
    this.src = src
    if (style) this.style = style
  }

  protected _onUpdateSrc() {
    this.load(true)
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

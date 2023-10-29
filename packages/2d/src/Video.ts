import { VideoTexture, customNode, property } from '@rubickjs/core'
import { Assets } from '@rubickjs/assets'
import { Transform2D } from '@rubickjs/math'
import { Element2d } from './element2d'
import type { Element2dOptions } from './element2d'

export interface VideoOptions extends Element2dOptions {
  src?: string
}

@customNode('video')
export class Video extends Element2d {
  @property() src = ''

  protected _src?: VideoTexture

  constructor(options: VideoOptions = {}) {
    super()
    this.setProperties(options)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'src':
        this._loadSrc(value)
        break
    }
  }

  protected async _loadSrc(src: string): Promise<void> {
    const texture = await Assets.load(src)
    if (texture instanceof VideoTexture) {
      this._src = texture
      if (!this.width || !this.height) {
        this.width = this._src.width
        this.height = this._src.height
      }
      this._requestRedraw()
    }
  }

  protected _drawSrc() {
    const src = this._src
    if (src) {
      this._context.texture = src
      this._context.textureTransform = new Transform2D().scale(
        this.width! / src.width,
        this.height! / src.height,
      )
    }
  }

  protected override _drawFill() {
    this._drawSrc()
    super._drawFill()
  }

  protected _updateVideoCurrentTime(): void {
    let currentTime = (this._tree?.timeline.currentTime ?? 0) - this.visibleStartTime
    if (currentTime < 0) return

    const texture = this._src
    if (!texture) return

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
    if (this.isVisible()) {
      this._updateVideoCurrentTime()
    }

    super._process(delta)
  }
}

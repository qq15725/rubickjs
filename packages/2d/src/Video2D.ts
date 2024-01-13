import { VideoTexture, customNode, property } from '@rubickjs/core'
import { Assets } from '@rubickjs/assets'
import { Transform2D } from '@rubickjs/math'
import { Element2D } from './element2D'
import type { Element2DProperties } from './element2D'

export interface Video2DProperties extends Element2DProperties {
  src?: string
}

@customNode('Video')
export class Video2D extends Element2D {
  @property({ default: '' }) src!: string

  get texture() { return this._src }

  protected _wait = Promise.resolve()
  protected _src?: VideoTexture

  constructor(properties?: Video2DProperties) {
    super()
    properties && this.setProperties(properties)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'src':
        this._wait = this._load(value)
        break
    }
  }

  waitLoad(): Promise<void> { return this._wait }

  protected async _load(src: string): Promise<void> {
    const texture = await Assets.load(src)
    if (texture instanceof VideoTexture) {
      this._src = texture
      if (!this.width || !this.height) {
        this.width = this._src.width
        this.height = this._src.height
      }
      this.requestRedraw()
    }
  }

  protected override _drawContent() {
    const src = this._src
    if (src) {
      this._context.texture = src
      this._context.textureTransform = new Transform2D().scale(
        this.width! / src.width,
        this.height! / src.height,
      )
    }
    super._drawContent()
  }

  protected _updateVideoCurrentTime(): void {
    let currentTime = this.visibleRelativeTime
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
    if (this.isRenderable()) {
      this._updateVideoCurrentTime()
    }

    super._process(delta)
  }
}
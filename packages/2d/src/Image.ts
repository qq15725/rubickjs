import { customNode, property } from '@rubickjs/core'
import { Assets } from '@rubickjs/assets'
import { Transform2D, clamp } from '@rubickjs/math'
import { Element2d } from './element2d'
import type { CanvasBatchable2D } from '@rubickjs/canvas'
import type { Texture } from '@rubickjs/core'
import type { Element2dOptions } from './element2d'

export interface ImageFrame {
  duration: number
  texture: Texture
}

export interface ImageOptions extends Element2dOptions {
  src?: string
}

@customNode('image')
export class Image extends Element2d {
  @property() src = ''

  get duration() { return this._duration }

  protected _duration = 0
  protected _frames: Array<ImageFrame> = []
  protected _src?: Texture

  constructor(options: ImageOptions = {}) {
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
    this._frames = Array.isArray(texture) ? texture : [{ duration: 0, texture }]
    this._duration = this._frames.reduce((duration, frame) => frame.duration + duration, 0)
    this._src = this._frames[0]?.texture
    if (this._src && (!this.width || !this.height)) {
      this.width = this._src.width
      this.height = this._src.height
    }
    this._requestRedraw()
  }

  protected _updateFrame(): void {
    let currentTime = (this._tree?.timeline.currentTime ?? 0) - this.visibleStartTime
    if (currentTime < 0) return

    const frames = this._frames
    currentTime = this._duration ? currentTime % this._duration : 0
    const len = frames.length

    let index = len - 1
    for (let time = 0, i = 0; i < len; i++) {
      time += frames[i]?.duration ?? 0
      if (time >= currentTime) {
        index = i
        break
      }
    }

    const frame = frames[clamp(0, index, len - 1)]
    if (frame) {
      this._src = frame.texture
      this._requestRepaint()
    }
  }

  protected override _process(delta: number) {
    super._process(delta)
    this._updateFrame()
  }

  protected _drawSrc() {
    const src = this._src
    if (src?.valid) {
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

  protected override _repaint(batchables: Array<CanvasBatchable2D>): Array<CanvasBatchable2D> {
    return super._repaint(
      batchables.map(batchable => {
        if (batchable.type === 'fill') {
          return {
            ...batchable,
            texture: this._src?.valid ? this._src : undefined,
          }
        }
        return batchable
      }),
    )
  }
}

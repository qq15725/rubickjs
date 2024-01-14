import { customNode, property, protectedProperty } from '@rubickjs/core'
import { Assets } from '@rubickjs/assets'
import { Transform2D } from '@rubickjs/math'
import { Element2D } from './Element2D'
import { Image2DResource } from './Image2DResource'
import type { Texture } from '@rubickjs/core'
import type { Image2DFrame } from './Image2DResource'
import type { CanvasBatchable2D } from '@rubickjs/canvas'
import type { Element2DProperties } from './Element2D'

export interface Image2DProperties extends Element2DProperties {
  src?: string
}

@customNode('image2D')
export class Image2D extends Element2D {
  @protectedProperty() resource?: Image2DResource
  @property({ default: '' }) src!: string

  get currentTexture(): Texture | undefined { return this.resource?.frames[this._frameIndex]?.texture }
  get duration(): number { return this.resource?.duration ?? 0 }

  // HTMLImageElement
  get naturalWidth() { return this.currentTexture?.realWidth ?? 0 }
  get naturalHeight() { return this.currentTexture?.realHeight ?? 0 }
  get complete() { return this._complete }

  protected _frameIndex = 0
  protected _complete = false
  protected _wait = Promise.resolve()

  constructor(properties?: Image2DProperties) {
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

  decode(): Promise<void> { return this._wait }

  set(source: Texture | Array<Image2DFrame> | Image2DResource): this {
    let resource: Image2DResource
    if (source instanceof Image2DResource) {
      resource = source
    } else {
      resource = new Image2DResource(source)
    }
    this.resource = resource.updateDuration()
    if (this.currentTexture && (!this.width || !this.height)) {
      const texture = this.currentTexture
      this.width = texture.realWidth
      this.height = texture.realHeight
    }
    return this
  }

  protected async _load(src: string): Promise<void> {
    this._complete = false
    if (src) {
      try {
        this.set(await Assets.load(src) as any)
        this.requestRedraw()
        this.emit('load')
      } catch (err) {
        console.warn(err)
        this.emit('error', err)
      }
    } else {
      this.resource = undefined
    }
    this._complete = true
  }

  protected _getCurrentTime(): number {
    const duration = this.resource?.duration ?? 0
    if (!duration || !this._tree) return 0
    const currentTime = this.visibleRelativeTime
    if (currentTime < 0) return 0
    return currentTime % duration
  }

  protected _updateFrameIndex(): this {
    if (!this.resource) return this
    const currentTime = this._getCurrentTime()
    const frames = this.resource.frames
    const len = frames.length
    if (len <= 1 && this._frameIndex === 0) return this
    let index = len - 1
    for (let time = 0, i = 0; i < len; i++) {
      time += frames[i].duration ?? 0
      if (time >= currentTime) {
        index = i
        break
      }
    }
    if (this._frameIndex !== index) {
      this._frameIndex = index
      this.requestRepaint()
    }
    return this
  }

  protected override _process(delta: number) {
    if (this.isRenderable()) {
      this._updateFrameIndex()
    }
    super._process(delta)
  }

  protected override _drawContent() {
    const texture = this.currentTexture
    if (texture?.valid) {
      this._context.texture = texture
      this._context.textureTransform = new Transform2D().scale(
        this.width! / texture.width,
        this.height! / texture.height,
      )
      super._drawContent()
    }
  }

  protected override _repaint(batchables: Array<CanvasBatchable2D>): Array<CanvasBatchable2D> {
    const texture = this.currentTexture
    return super._repaint(
      batchables.map((batchable, i) => {
        if ((this._backgroundImage ? i === 1 : i === 0) && batchable.type === 'fill') {
          return {
            ...batchable,
            texture: texture?.valid ? texture : undefined,
          }
        }
        return batchable
      }),
    )
  }
}

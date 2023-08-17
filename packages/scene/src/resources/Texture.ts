import { Vector2 } from '@rubickjs/math'
import { isImageElement, isVideoElement } from '@rubickjs/shared'
import { Resouce } from '../main/Resouce'
import type { WebGLTextureFilterMode, WebGLTextureWrapMode } from '@rubickjs/renderer'

export type TextureFilterMode = WebGLTextureFilterMode
export type TextureWrapMode = WebGLTextureWrapMode

export class Texture extends Resouce {
  /**
   * Empty texture
   */
  static EMPTY = new this({ width: 1, height: 1, pixels: new Uint8ClampedArray(4) })

  /**
   * White texture
   */
  static WHITE = new this({ width: 1, height: 1, pixels: new Uint8ClampedArray([255, 255, 255, 255]) })

  /**
   * Texture source
   */
  readonly source: TexImageSource | ArrayBufferView | null

  /**
   * Texture width and height
   */
  readonly size: Vector2

  get width() { return this.size.x }
  get height() { return this.size.y }

  /**
   * Texture filter mode
   */
  filterMode: TextureFilterMode = 'linear'

  /**
   * Texture wrap mode
   */
  wrapMode: TextureWrapMode = 'repeat'

  /**
   * Pixel ratio
   */
  pixelRatio = 1

  constructor(
    source: TexImageSource | {
      width: number
      height: number
      pixels: ArrayBufferView | null
    },
  ) {
    super()
    this.source = 'pixels' in source ? source.pixels : source
    const any = source as any
    this.size = new Vector2(
      Number(any.naturalWidth || any.videoWidth || any.width || 0),
      Number(any.naturalHeight || any.videoHeight || any.height || 0),
    ).onUpdate(this._onUpdateSize.bind(this))

    if (isVideoElement(source) || isImageElement(source)) {
      this.name = source.src
    }
  }

  protected _onUpdateSize() {
    this.addDirty('size')
  }

  getTextureProps() {
    const source = this.source
    return {
      index: 0,
      target: 'texture_2d' as const,
      source: !source || 'buffer' in source
        ? {
            width: this.size.x * this.pixelRatio,
            height: this.size.y * this.pixelRatio,
            pixels: source ?? null,
          }
        : source,
      filterMode: this.filterMode,
      wrapMode: this.wrapMode,
    }
  }

  getRelated(): WebGLTexture {
    const renderer = this.renderer
    return renderer.getRelated(this, () => {
      return renderer.createTexture(this.getTextureProps())
    })
  }

  update() {
    this.clearDirty()

    this.renderer
      .updateTexture(this.getRelated(), this.getTextureProps())
  }

  activate(unit = 0, then?: () => void | false) {
    this.renderer
      .activeTexture({
        target: 'texture_2d',
        value: this.getRelated(),
        unit,
      }, () => {
        if (this.isDirty) {
          this.update()
        }

        return then?.()
      })
  }
}

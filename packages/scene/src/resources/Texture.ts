import { Vector2 } from '@rubickjs/math'
import { Ref, Resouce, isImageElement, isVideoElement } from '@rubickjs/shared'
import type { WebGLRenderer, WebGLTextureFilterMode, WebGLTextureWrapMode } from '@rubickjs/renderer'

export type TextureFilterMode = WebGLTextureFilterMode
export type TextureWrapMode = WebGLTextureWrapMode

export class Texture extends Resouce {
  /** Empty texture */
  static EMPTY = new this({ width: 1, height: 1, pixels: new Uint8ClampedArray(4) })
  /** White texture */
  static WHITE = new this({ width: 1, height: 1, pixels: new Uint8ClampedArray([255, 255, 255, 255]) })

  /**
   * Texture source
   */
  readonly source: TexImageSource | ArrayBufferView | null

  /**
   * Texture width and height
   */
  readonly size: Vector2
  get width() { return this.size[0] }
  get height() { return this.size[1] }

  /**
   * Texture filter mode
   */
  protected readonly _filterMode = new Ref<TextureFilterMode>('linear')
  get filterMode() { return this._filterMode.value }
  set filterMode(val) { this._filterMode.value = val }

  /**
   * Texture wrap mode
   */
  protected readonly _wrapMode = new Ref<TextureWrapMode>('repeat')
  get wrapMode() { return this._wrapMode.value }
  set wrapMode(val) { this._wrapMode.value = val }

  /**
   * Pixel ratio
   */
  protected readonly _pixelRatio = new Ref(1)
  get pixelRatio() { return this._pixelRatio.value }
  set pixelRatio(val) { this._pixelRatio.value = val }

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

  glTextureProps() {
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
      filterMode: this._filterMode.value,
      wrapMode: this._wrapMode.value,
    }
  }

  glTexture(renderer: WebGLRenderer): WebGLTexture {
    return renderer.getRelated(this, () => {
      return renderer.createTexture(this.glTextureProps())
    })
  }

  upload(renderer: WebGLRenderer) {
    if (!this.isDirty) {
      return
    }

    this.clearDirty()

    renderer.updateTexture(
      this.glTexture(renderer),
      this.glTextureProps(),
    )
  }

  activate(
    renderer: WebGLRenderer,
    location = 0,
    then?: () => void | false,
  ) {
    renderer.activeTexture({
      target: 'texture_2d',
      value: this.glTexture(renderer),
      unit: location,
    }, () => {
      this.upload(renderer)

      return then?.()
    })
  }
}


import { Vector2 } from '@rubickjs/math'
import { Ref, isImageElement, isVideoElement } from '@rubickjs/shared'
import { Resource } from '../Resource'
import type { WebGLRenderer, WebGLTextureFilterMode, WebGLTextureWrapMode } from '@rubickjs/renderer'

export type TextureFilterMode = WebGLTextureFilterMode
export type TextureWrapMode = WebGLTextureWrapMode
export type TextureSource = TexImageSource | {
  width: number
  height: number
  pixels: ArrayBufferView | null
}

export class Texture<T extends TextureSource = TextureSource> extends Resource {
  /** Texture source */
  readonly source: T

  /** Texture width and height */
  readonly _size = new Vector2(0, 0)
  get size(): Vector2 { return this._size }
  set size(val: { x: number; y: number }) { this._size.update(val.x, val.y) }
  get width() { return this._size.x }
  set width(val) { this._size.x = val }
  get height() { return this._size.y }
  set height(val) { this._size.y = val }
  get valid(): boolean { return Boolean(this._size[0] && this._size[1]) }

  /** Texture filter mode */
  protected readonly _filterMode = new Ref<TextureFilterMode>('linear')
  get filterMode() { return this._filterMode.value }
  set filterMode(val) { this._filterMode.value = val }

  /** Texture wrap mode */
  protected readonly _wrapMode = new Ref<TextureWrapMode>('repeat')
  get wrapMode() { return this._wrapMode.value }
  set wrapMode(val) { this._wrapMode.value = val }

  /** Pixel ratio */
  protected readonly _pixelRatio = new Ref(1)
  get pixelRatio() { return this._pixelRatio.value }
  set pixelRatio(val) { this._pixelRatio.value = val }

  constructor(
    source: T,
  ) {
    super()

    this.source = source

    this.update()

    this.size.onUpdate(this._onUpdateSize.bind(this))

    if (isVideoElement(source) || isImageElement(source)) {
      this.name = source.src
    }
  }

  protected _onUpdateSize() {
    this.addDirty('size')
  }

  protected _getSouce(): TextureSource {
    return this.source
  }

  glTextureProps() {
    let source = this._getSouce()

    if ('pixels' in source) {
      source = {
        width: this.size.x * this.pixelRatio,
        height: this.size.y * this.pixelRatio,
        pixels: source.pixels,
      }
    }

    return {
      index: 0,
      target: 'texture_2d' as const,
      source,
      filterMode: this._filterMode.value,
      wrapMode: this._wrapMode.value,
    }
  }

  glTexture(renderer: WebGLRenderer): WebGLTexture {
    return renderer.getRelated(this, () => {
      return renderer.createTexture(this.glTextureProps())
    })
  }

  update(): void {
    const source = this.source as any

    this._size.update(
      Number(source.naturalWidth || source.videoWidth || source.width || 0),
      Number(source.naturalHeight || source.videoHeight || source.height || 0),
    )

    this.addDirty('source')
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


import { Vector2 } from '@rubickjs/math'
import { Resource } from '../Resource'
import type { WebGLRenderer, WebGLTextureFilterMode, WebGLTextureWrapMode } from '@rubickjs/renderer'

export type TextureFilterMode = WebGLTextureFilterMode
export type TextureWrapMode = WebGLTextureWrapMode
export type TexturePixelsSource = {
  width: number
  height: number
  pixels: Uint8Array | null
}
export type TextureSource = TexImageSource | TexturePixelsSource

export class Texture<T extends TextureSource = TextureSource> extends Resource {
  /** Empty texture */
  static get EMPTY() { return new this({ width: 1, height: 1, pixels: null }) }

  /** White texture */
  static get WHITE() { return new this({ width: 1, height: 1, pixels: new Uint8Array([255, 255, 255, 255]) }) }

  /** Texture width and height */
  protected _size = new Vector2(0, 0)
  get size(): Vector2 { return this._size }
  set size(val: { x: number; y: number }) { this._size.update(val.x, val.y) }
  get width() { return this._size.x }
  set width(val) { this._size.x = val }
  get height() { return this._size.y }
  set height(val) { this._size.y = val }
  get valid(): boolean { return Boolean(this._size[0] && this._size[1]) }

  /** Filter mode */
  protected _filterMode: TextureFilterMode = 'linear'
  get filterMode() { return this._filterMode }
  set filterMode(val) {
    if (this._filterMode === val) {
      this._filterMode = val
      this.addDirty('filterMode')
    }
  }

  /** Wrap mode */
  protected _wrapMode: TextureWrapMode = 'clamp_to_edge'
  get wrapMode() { return this._wrapMode }
  set wrapMode(val) {
    if (this._wrapMode !== val) {
      this._wrapMode = val
      this.addDirty('wrapMode')
    }
  }

  /** Pixel ratio */
  protected _pixelRatio = 1
  get pixelRatio() { return this._pixelRatio }
  set pixelRatio(val) {
    if (this._pixelRatio !== val) {
      this._pixelRatio = val
      this.addDirty('pixelRatio')
    }
  }

  constructor(
    public source: T,
  ) {
    super()
    this.updateSource()
    this.size.onUpdate(this._onUpdateSize.bind(this))
  }

  protected _getSouce(): TextureSource {
    return this.source
  }

  glTextureProps() {
    return {
      index: 0,
      target: 'texture_2d' as const,
      source: this._getSouce(),
      filterMode: this._filterMode,
      wrapMode: this._wrapMode,
    }
  }

  glTexture(renderer: WebGLRenderer): WebGLTexture {
    return renderer.getRelated(this, () => {
      return renderer.createTexture(this.glTextureProps())
    })
  }

  protected _onUpdateSize() {
    if ('pixels' in this.source && !this.source.pixels) {
      const source = this.source as TexturePixelsSource
      const pixelRatio = this.pixelRatio
      const [width, height] = this._size
      source.width = width * pixelRatio
      source.height = height * pixelRatio
    }
    this.addDirty('size')
  }

  updateSource() {
    const source = this.source as any
    const width = Number(source.naturalWidth || source.videoWidth || source.width || 0)
    const height = Number(source.naturalHeight || source.videoHeight || source.height || 0)
    const pixelRatio = this._pixelRatio
    this._size.update(width / pixelRatio, height / pixelRatio)
    this.addDirty('source')
  }

  upload(renderer: WebGLRenderer) {
    if (!this.isDirty) return
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


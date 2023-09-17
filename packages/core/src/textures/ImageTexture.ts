import { SUPPORTS_CREATE_IMAGE_BITMAP, crossOrigin } from '@rubickjs/shared'
import { Texture } from './Texture'
import type { WebGLRenderer } from '@rubickjs/renderer'

export interface ImageTextureOptions {
  autoLoad?: boolean
  useBitmap?: boolean
  crossorigin?: boolean | string | null
  // alphaMode?: ALPHA_MODES
}

function resovledOptions(options?: ImageTextureOptions): Required<ImageTextureOptions> {
  return {
    autoLoad: Boolean(options?.autoLoad ?? true),
    useBitmap: Boolean(options?.useBitmap ?? true) && SUPPORTS_CREATE_IMAGE_BITMAP,
    crossorigin: Boolean(options?.crossorigin ?? null),
  }
}

export class ImageTexture extends Texture<HTMLImageElement> {
  /** List of common image file extensions supported by ImageTexture. */
  static readonly TYPES = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg', 'svg+xml'])

  bitmap?: ImageBitmap
  useBitmap: boolean
  preserveBitmap = false

  protected _load?: Promise<this>
  protected _cachedGenBitmap?: Promise<this>

  constructor(
    source: HTMLImageElement | string,
    options?: ImageTextureOptions,
  ) {
    const resovled = resovledOptions(options)

    if (typeof source === 'string') {
      const imageElement = new Image()
      crossOrigin(imageElement, source, resovled.crossorigin)
      imageElement.src = source
      source = imageElement
    }

    super(source)

    this.useBitmap = resovled.useBitmap
    // this.alphaMode = typeof resovled.alphaMode === 'number' ? resovled.alphaMode : null

    if (resovled.autoLoad) {
      this.load()
    }
  }

  /**
   * Returns a promise when image will be loaded and processed.
   */
  load(): Promise<this> {
    if (this._load) {
      return this._load
    }

    this._load = new Promise((resolve, reject): void => {
      const source = this.source

      const completed = (): void => {
        if (this.destroyed) {
          return
        }
        source.onload = null
        source.onerror = null
        this.update()
        this._load = undefined
        if (this.useBitmap) {
          resolve(this.genBitmap())
        } else {
          resolve(this)
        }
      }

      if (source.complete && source.src) {
        completed()
      } else {
        source.onload = completed
        source.onerror = (event): void => {
          reject(event)
          this.emit('error', event)
        }
      }
    })

    return this._load
  }

  /**
   * Called when we need to convert image into BitmapImage.
   * Can be called multiple times, real promise is cached inside.
   * @returns - Cached promise to fill that bitmap
   */
  genBitmap(): Promise<this> {
    if (this._cachedGenBitmap) {
      return this._cachedGenBitmap
    }

    if (this.bitmap || !SUPPORTS_CREATE_IMAGE_BITMAP) {
      return Promise.resolve(this)
    }

    const source = this.source
    const cors = !source.crossOrigin || source.crossOrigin === 'anonymous'

    this._cachedGenBitmap = fetch(source.src, { mode: cors ? 'cors' : 'no-cors' })
      .then(r => r.blob())
      .then(blob => {
        return createImageBitmap(blob, 0, 0, source.width, source.height, {
          // TODO
          premultiplyAlpha: 'premultiply',
        })
      })
      .then(bitmap => {
        if (this.destroyed) {
          return Promise.reject(new Error('ImageTexture is destroyed'))
        }
        this.bitmap = bitmap
        this.update()
        this._cachedGenBitmap = undefined
        return this
      })
      .catch(err => {
        console.warn('Failed to genBitmap', err)
        return this
      })

    return this._cachedGenBitmap
  }

  protected override _getSouce() {
    return this.bitmap ?? this.source
  }

  override upload(renderer: WebGLRenderer) {
    if (this.useBitmap && !this.bitmap) {
      this.genBitmap()
      return
    }

    super.upload(renderer)

    // TODO
    if (this.preserveBitmap && this.bitmap) {
      this.bitmap.close()
      this.bitmap = undefined
    }
  }
}

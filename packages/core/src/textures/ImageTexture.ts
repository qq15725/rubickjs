import { SUPPORTS_CREATE_IMAGE_BITMAP, crossOrigin } from '@rubickjs/shared'
import { Texture } from './Texture'
import type { WebGLRenderer } from '@rubickjs/renderer'

export interface ImageTextureOptions {
  autoLoad?: boolean
  useBitmap?: boolean
  crossorigin?: boolean | string | null
  // alphaMode?: ALPHA_MODES
}

function resolveOptions(options?: ImageTextureOptions): Required<ImageTextureOptions> {
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

  protected _loadSource?: Promise<this>
  protected _loadBitmap?: Promise<this>

  constructor(
    source: HTMLImageElement | string,
    options?: ImageTextureOptions,
  ) {
    const resovled = resolveOptions(options)

    if (typeof source === 'string') {
      const imageElement = new Image()
      crossOrigin(imageElement, source, resovled.crossorigin)
      imageElement.src = source
      source = imageElement
    }

    super(source)

    const src = source.src
    const isSVG = src.includes('.svg') || src.startsWith('data:image/svg+xml')
    this.useBitmap = resovled.useBitmap && !isSVG
    // this.alphaMode = typeof resovled.alphaMode === 'number' ? resovled.alphaMode : null

    if (resovled.autoLoad) {
      this.load()
    }
  }

  async load(): Promise<this> {
    if (!this._loadSource) {
      this._loadSource = new Promise(resolve => {
        this._loadSource = undefined

        const source = this.source

        const onResolve = () => {
          source.onload = null
          source.onerror = null
        }

        const onLoad = () => {
          onResolve()
          this.updateSource()
          if (this.useBitmap) {
            this.genBitmap().finally(() => resolve(this))
          } else {
            resolve(this)
          }
        }

        const onError = (error: string | Event) => {
          onResolve()
          console.warn(`Failed to load ImageTexture, src: ${ source.src }`, error)
          this.emit('error', error)
          resolve(this)
        }

        if (source.complete && source.src) {
          onLoad()
        } else {
          source.onload = onLoad
          source.onerror = onError
        }
      })
    }

    return this._loadSource
  }

  /**
   * Called when we need to convert image into BitmapImage.
   * Can be called multiple times, real promise is cached inside.
   * @returns - Cached promise to fill that bitmap
   */
  genBitmap(): Promise<this> {
    if (this._loadBitmap) {
      return this._loadBitmap
    }

    if (this.bitmap || !SUPPORTS_CREATE_IMAGE_BITMAP) {
      return Promise.resolve(this)
    }

    const src = this.source
    const cors = !src.crossOrigin || src.crossOrigin === 'anonymous'

    this._loadBitmap = globalThis.fetch(src.src, { mode: cors ? 'cors' : 'no-cors' })
      .then(r => r.blob())
      .then(blob => {
        return globalThis.createImageBitmap(blob, 0, 0, src.width, src.height, {
          // TODO
          premultiplyAlpha: 'premultiply',
        })
      })
      .then(bitmap => {
        this.bitmap = bitmap
        this.updateSource()
        this._loadBitmap = undefined
        return this
      })
      .catch(err => {
        console.warn('Failed to genBitmap', err)
        return this
      })

    return this._loadBitmap
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

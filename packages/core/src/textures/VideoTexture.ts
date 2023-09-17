import { Ref, crossOrigin, isVideoElement } from '@rubickjs/shared'
import { Ticker } from '../Ticker'
import { Texture } from './Texture'

export interface VideoTextureOptions {
  autoLoad?: boolean
  autoPlay?: boolean
  fps?: number
  crossorigin?: boolean | string | null
  loop?: boolean
  muted?: boolean
  playsinline?: boolean
}

export interface VideoTextureSource {
  src: string
  mime: string
}

function resolveOptions(options?: VideoTextureOptions): Required<VideoTextureOptions> {
  return {
    autoLoad: Boolean(options?.autoLoad ?? true),
    autoPlay: Boolean(options?.autoPlay ?? false),
    fps: Number(options?.fps ?? 0),
    crossorigin: options?.crossorigin ?? null,
    loop: Boolean(options?.loop ?? false),
    muted: Boolean(options?.muted ?? false),
    playsinline: Boolean(options?.playsinline ?? true),
  }
}

export class VideoTexture extends Texture<HTMLVideoElement> {
  /** List of common video file extensions supported by VideoTexture. */
  static readonly TYPES = new Set(['mp4', 'm4v', 'webm', 'ogg', 'ogv', 'h264', 'avi', 'mov'])

  /** Map of video MIME types that can't be directly derived from file extensions. */
  static readonly MIME_TYPES = new Map(Object.entries({
    ogv: 'video/ogg',
    mov: 'video/quicktime',
    m4v: 'video/mp4',
  }))

  get isReady(): boolean { return this.source.readyState > 2 }
  get isPlaying(): boolean { return (!this.source.paused && !this.source.ended && this.isReady) }

  protected _autoUpdate = new Ref(true)
  get autoUpdate() { return this._autoUpdate.value }
  set autoUpdate(val) { this._autoUpdate.value = val }

  protected _fps = new Ref(0)
  get fps() { return this._fps.value }
  set fps(val) { this._fps.value = val }
  protected _spf = this._fps.value ? Math.round(1000 / this._fps.value) : 0

  protected _autoPlay = false

  protected _nextTime = 0
  protected _load?: Promise<this>
  protected _connected = false
  protected _requestId?: number
  protected _resolve?: (value: this) => void
  protected _reject?: (event: ErrorEvent) => void

  constructor(
    source: HTMLVideoElement
    | Array<string | VideoTextureSource>
    | string,
    options?: VideoTextureOptions,
  ) {
    const resolved = resolveOptions(options)

    if (!isVideoElement(source)) {
      if (typeof source === 'string') {
        source = [source]
      }
      const firstSrc = (source[0] as VideoTextureSource).src || source[0] as string

      const videoElement = document.createElement('video')
      resolved.autoLoad && videoElement.setAttribute('preload', 'auto')
      if (resolved.playsinline) {
        videoElement.setAttribute('webkit-playsinline', '')
        videoElement.setAttribute('playsinline', '')
      }
      if (resolved.muted) {
        videoElement.setAttribute('muted', '')
        videoElement.muted = true
      }
      resolved.loop && videoElement.setAttribute('loop', '')
      resolved.autoPlay && videoElement.setAttribute('autoplay', '')
      crossOrigin(videoElement, firstSrc, resolved.crossorigin)
      for (let i = 0; i < source.length; ++i) {
        let { src, mime } = source[i] as VideoTextureSource
        src = src || source[i] as string
        if (src.startsWith('data:')) {
          mime = src.slice(5, src.indexOf(';'))
        } else if (!src.startsWith('blob:')) {
          const baseSrc = src.split('?').shift()!.toLowerCase()
          const ext = baseSrc.slice(baseSrc.lastIndexOf('.') + 1)
          mime = mime || VideoTexture.MIME_TYPES.get(ext) || `video/${ ext }`
        }
        const sourceElement = document.createElement('source')
        sourceElement.src = src
        if (mime) sourceElement.type = mime
        videoElement.appendChild(sourceElement)
      }

      source = videoElement
    }

    super(source)

    this.fps = resolved.fps
    this._autoPlay = resolved.autoPlay
    if (resolved.autoPlay) {
      this.load()
    }

    this._setupAutoUpdate()

    this._fps.on('update', val => {
      this._spf = val ? Math.round(1000 / val) : 0
      this._setupAutoUpdate()
    })

    this._autoUpdate.on('update', this._setupAutoUpdate)
  }

  protected _onPlayStart = () => {
    if (!this.valid) {
      this._onCanPlay()
    }
    this._setupAutoUpdate()
  }

  protected _onPlayStop = () => {
    this._setupAutoUpdate()
  }

  protected _onCanPlay = () => {
    const source = this.source
    source.removeEventListener('canplay', this._onCanPlay)
    source.removeEventListener('canplaythrough', this._onCanPlay)

    const valid = this.valid

    this._nextTime = 0
    this.update()
    this._nextTime = 0

    if (!valid && this._resolve) {
      this._resolve(this)
      this._resolve = undefined
      this._reject = undefined
    }

    if (this.isPlaying) {
      this._onPlayStart()
    } else if (this._autoPlay) {
      source.play()
    }
  }

  protected _onError = (event: ErrorEvent) => {
    this.source.removeEventListener('error', this._onError, true)
    this.emit('error', event)
    if (this._reject) {
      this._reject(event)
      this._reject = undefined
      this._resolve = undefined
    }
  }

  /** Fired when the video is completed seeking to the current playback position. */
  protected _onSeeked = (): void => {
    if (this._autoUpdate.value && !this.isPlaying) {
      this._nextTime = 0
      this.update()
      this._nextTime = 0
    }
  }

  protected _setupAutoUpdate(): void {
    if (this._autoUpdate.value && this.isPlaying) {
      if (!this._fps.value && this.source.requestVideoFrameCallback) {
        if (this._connected) {
          Ticker.instance.off('update', this.update)
          this._connected = false
          this._nextTime = 0
        }

        if (this._requestId === undefined) {
          this._requestId = this.source.requestVideoFrameCallback(
            this._videoFrameRequestCallback,
          )
        }
      } else {
        if (this._requestId !== undefined) {
          this.source.cancelVideoFrameCallback(this._requestId)
          this._requestId = undefined
        }

        if (!this._connected) {
          Ticker.instance.on('update', this.update)
          this._connected = true
          this._nextTime = 0
        }
      }
    } else {
      if (this._requestId !== undefined) {
        this.source.cancelVideoFrameCallback(this._requestId)
        this._requestId = undefined
      }

      if (this._connected) {
        Ticker.instance.off('update', this.update)
        this._connected = false
        this._nextTime = 0
      }
    }
  }

  protected _videoFrameRequestCallback = (): void => {
    this.update()

    if (this.destroyed) {
      this._requestId = undefined
    } else {
      this._requestId = this.source.requestVideoFrameCallback(this._videoFrameRequestCallback)
    }
  }

  update = (): void => {
    if (!this.destroyed) {
      const elapsed = Math.floor(Ticker.instance.elapsed * this.source.playbackRate)
      this._nextTime -= elapsed
      if (!this._spf || this._nextTime <= 0) {
        super.update()
        this._nextTime = this._spf || 0
      }
    }
  }

  load(): Promise<this> {
    if (this._load) {
      return this._load
    }

    const source = this.source

    if (
      (
        source.readyState === source.HAVE_ENOUGH_DATA
        || source.readyState === source.HAVE_FUTURE_DATA
      )
      && source.width
      && source.height
    ) {
      (source as any).complete = true
    }

    source.addEventListener('play', this._onPlayStart)
    source.addEventListener('pause', this._onPlayStop)
    source.addEventListener('seeked', this._onSeeked)

    if (!this.isReady) {
      source.addEventListener('canplay', this._onCanPlay)
      source.addEventListener('canplaythrough', this._onCanPlay)
      source.addEventListener('error', this._onError, true)
    } else {
      this._onCanPlay()
    }

    return this._load = new Promise((resolve, reject): void => {
      if (this.valid) {
        resolve(this)
      } else {
        this._resolve = resolve
        this._reject = reject
        source.load()
      }
    })
  }

  override dispose(): void {
    this._setupAutoUpdate()
    const source = this.source
    if (source) {
      source.removeEventListener('play', this._onPlayStart)
      source.removeEventListener('pause', this._onPlayStop)
      source.removeEventListener('seeked', this._onSeeked)
      source.removeEventListener('canplay', this._onCanPlay)
      source.removeEventListener('canplaythrough', this._onCanPlay)
      source.removeEventListener('error', this._onError, true)
      source.pause()
      source.src = ''
      source.load()
    }
    super.dispose()
  }
}

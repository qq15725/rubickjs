import { Sprite } from '@rubickjs/2d'
import { IN_BROWSER } from '@rubickjs/shared'
import { Texture } from '@rubickjs/core'
import { WebAudioContext } from './web'

export interface AudioWaveformStyle {
  gap?: number
  color?: string
}

export class AudioWaveform extends Sprite<Texture<HTMLCanvasElement>> {
  protected _audioBuffer?: AudioBuffer
  protected _srcLoad?: Promise<this>
  protected _src = ''
  get src() { return this._src }
  set src(val) {
    if (this._src !== val) {
      this._src = val
      this.load(true)
    }
  }

  protected _gap: number
  get gap() { return this._gap }
  set gap(val) {
    if (this._gap !== val) {
      this._gap = val
      this.scheduleUpdateTexture()
    }
  }

  protected _color: string
  get color() { return this._color }
  set color(val) {
    if (this._color !== val) {
      this._color = val
      this.scheduleUpdateTexture()
    }
  }

  constructor(
    src: string,
    style: AudioWaveformStyle = {},
  ) {
    super(
      IN_BROWSER
        ? new Texture(document.createElement('canvas'))
        : undefined,
    )
    this.src = src
    this._gap = style.gap ?? 0
    this._color = style.color ?? 'black'
    this.scheduleUpdateTexture()
  }

  async load(force = false): Promise<this> {
    const src = this._src

    if (!src) {
      return this
    }

    if (force || !this._srcLoad) {
      this._srcLoad = globalThis.fetch(src)
        .then(rep => rep.arrayBuffer())
        .then(buffer => WebAudioContext.decode(buffer))
        .then(buffer => {
          if (src === this._src) {
            this._audioBuffer = buffer
            this.scheduleUpdateTexture()
          }
          return this
        })
    }

    return this._srcLoad
  }

  scheduleUpdateTexture() { this.addDirty('texture') }

  protected _onUpdateSize() {
    super._onUpdateSize()
    this.scheduleUpdateTexture()
  }

  updateTexture(): void {
    const audioBuffer = this._audioBuffer
    if (!audioBuffer) return

    if (!this.hasDirty('texture')) return
    this.deleteDirty('texture')

    const canvas = this._texture.source
    const [width, height] = this.size
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      console.warn('Failed to getContext(\'2d\') in updateTexture')
      return
    }

    context.fillStyle = this._color
    const data = audioBuffer.getChannelData(0)
    const step = Math.ceil(data.length / width)
    const amp = height / 2

    for (let min = 1, max = -1, i = 0; i < width; i++) {
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j]
        if (datum < min) {
          min = datum
        }
        if (datum > max) {
          max = datum
        }
      }

      if (!this._gap || (i % (this._gap * 2) === 0)) {
        const x = i
        const y = (1 + min) * amp
        const w = this._gap || 1
        const h = Math.max(1, (max - min) * amp)
        context.fillRect(x, y, w, h)
        min = 1
        max = -1
      }
    }

    this.texture.updateSource()
    this._onUpdateTexture()
  }

  protected override _process(delta: number) {
    this.updateTexture()
    super._process(delta)
  }
}

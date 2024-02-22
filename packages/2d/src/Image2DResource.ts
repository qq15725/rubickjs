import { Resource, Texture } from '@rubickjs/core'

export interface Image2DFrame {
  texture: Texture
  duration: number
}

export class Image2DResource extends Resource {
  frames: Array<Image2DFrame>
  duration!: number

  constructor(
    source: Texture | Array<Image2DFrame>,
  ) {
    super()
    let frames
    if (Array.isArray(source)) {
      frames = source
    } else if (source instanceof Texture) {
      frames = [{ texture: source, duration: 0 }]
    } else {
      throw new TypeError('Failed new Image2DResource')
    }
    this.frames = frames
    this.updateDuration()
  }

  updateDuration(): this {
    this.duration = this.frames.reduce((duration, frame) => frame.duration + duration, 0)
    return this
  }
}

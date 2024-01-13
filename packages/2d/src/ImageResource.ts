import { Resource, Texture } from '@rubickjs/core'

export interface ImageFrame {
  texture: Texture
  duration: number
}

export class ImageResource extends Resource {
  frames: Array<ImageFrame>
  duration!: number

  constructor(
    source: Texture | Array<ImageFrame>,
  ) {
    super()
    let frames
    if (Array.isArray(source)) {
      frames = source
    } else if (source instanceof Texture) {
      frames = [{ texture: source, duration: 0 }]
    } else {
      throw new TypeError('Failed new ImageResource')
    }
    this.frames = frames
    this.updateDuration()
  }

  updateDuration(): this {
    this.duration = this.frames.reduce((duration, frame) => frame.duration + duration, 0)
    return this
  }
}

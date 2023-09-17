import { Texture } from './Texture'

export class PixelsTexture extends Texture {
  /** Empty texture */
  static EMPTY = new this(null, 1, 1)

  /** White texture */
  static WHITE = new this([255, 255, 255, 255], 1, 1)

  constructor(
    pixels?: ArrayLike<number> | ArrayBufferLike | ArrayBufferView | null,
    width = 1,
    height = 1,
  ) {
    const source = {
      width,
      height,
      pixels: null as null | Uint8ClampedArray,
    }

    if (!pixels) {
      //
    } else if (ArrayBuffer.isView(pixels)) {
      source.pixels = new Uint8ClampedArray(pixels.buffer)
    } else {
      source.pixels = new Uint8ClampedArray(pixels)
    }

    super(source)
  }
}

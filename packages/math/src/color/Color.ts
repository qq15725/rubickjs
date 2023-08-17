import { colord } from 'colord'

import type {
  AnyColor,
  HslColor,
  HslaColor,
  HsvColor,
  HsvaColor,
  RgbColor,
  RgbaColor,
} from 'colord'

export type ColorValue =
  | string | number | number[] | Float32Array | Float64Array | Uint8Array | Uint8ClampedArray
  | HslColor | HslaColor | HsvColor | HsvaColor | RgbColor | RgbaColor | Number

const HEX_PATTERN = /^(#|0x)?(([a-f0-9]{3}){1,2}([a-f0-9]{2})?)$/i

export class Color {
  static instance = new Color(1, 1, 1, 1)

  protected _value?: ColorValue

  get r8(): number { return this.r * 255 & 0xFF }
  get g8(): number { return this.g * 255 & 0xFF }
  get b8(): number { return this.b * 255 & 0xFF }
  get a8(): number { return this.a * 255 & 0xFF }
  get rgb(): number { return (this.r8 << 16) + (this.g8 << 8) + this.b8 }
  get abgr(): number { return this.a * 4278190080 + (this.b8 << 16) + (this.g8 << 8) + this.r8 }

  constructor(
    public r = 0,
    public g = 0,
    public b = 0,
    public a = 0,
  ) {
    //
  }

  static from(value: ColorValue) {
    return new this().normalize(value)
  }

  set(r = 0, g = 0, b = 0, a = 0): this {
    this.r = r
    this.g = g
    this.b = b
    this.a = a
    return this
  }

  round(steps: number): this {
    this.r = Math.round(this.r * steps) / steps
    this.g = Math.round(this.g * steps) / steps
    this.b = Math.round(this.b * steps) / steps
    return this
  }

  update(val: ColorValue) {
    if (val !== this._value) {
      this._value = val
      this.normalize(val)
    }
  }

  normalize(value: ColorValue): this {
    let r: number | undefined
    let g: number | undefined
    let b: number | undefined
    let a: number | undefined

    const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max)

    if (typeof value === 'number' && value >= 0 && value <= 0xFFFFFF) {
      const int = value as number
      r = clamp(((int >> 16) & 0xFF) / 255)
      g = clamp(((int >> 8) & 0xFF) / 255)
      b = clamp((int & 0xFF) / 255)
      a = 1.0
    } else if (
      (Array.isArray(value) || value instanceof Float32Array || value instanceof Float64Array)
      && value.length >= 3 && value.length <= 4
    ) {
      [r, g, b, a = 1.0] = value.map(val => clamp(val))
    } else if (
      (value instanceof Uint8Array || value instanceof Uint8ClampedArray)
      && value.length >= 3 && value.length <= 4
    ) {
      [r, g, b, a = 255] = value.map(val => clamp(val, 0, 255))
      r /= 255
      g /= 255
      b /= 255
      a /= 255
    } else if (typeof value === 'string' || typeof value === 'object') {
      if (typeof value === 'string') {
        const match = HEX_PATTERN.exec(value)
        if (match) value = `#${ match[2] }`
      }

      const color = colord(value as AnyColor)

      if (color.isValid()) {
        ({ r, g, b, a } = color.rgba)
        r /= 255
        g /= 255
        b /= 255
      }
    }

    if (r === undefined) {
      throw new Error(`Unable to convert color ${ value }`)
    }

    this.r = r!
    this.g = g!
    this.b = b!
    this.a = a!
    return this
  }

  toArgb(alpha = this.a, applyToRGB = true): number {
    if (alpha === 1.0) {
      return 4278190080 + this.rgb
    }

    if (alpha === 0.0) {
      return applyToRGB ? 0 : this.rgb
    }

    let r = this.r8
    let g = this.g8
    let b = this.b8

    if (applyToRGB) {
      r = ((r * alpha) + 0.5) | 0
      g = ((g * alpha) + 0.5) | 0
      b = ((b * alpha) + 0.5) | 0
    }

    return alpha * 4278190080 + (r << 16) + (g << 8) + b
  }

  toHex(): string {
    const hex = this.rgb.toString(16)
    return `#${ '000000'.substring(0, 6 - hex.length) + hex }`
  }

  toHexa(): string {
    const alpha = this.a8.toString(16)
    return this.toHex() + '00'.substring(0, 2 - alpha.length) + alpha
  }

  toArray(): Array<number> {
    return [this.r, this.g, this.b, this.a]
  }
}

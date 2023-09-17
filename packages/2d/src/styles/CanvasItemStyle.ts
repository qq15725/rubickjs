import { PI_2 } from '@rubickjs/math'
import type { CanvasItem } from '../CanvasItem'

const FUNCTIONS_RE = /([\w-]+)\((.+?)\)/g
const VALUES_RE = /[-\w.]+/g
const VALUE_RE = /([-\d.]+)(.*)/

export class CanvasItemStyle {
  get visibility() { return this._source.visible ? 'visible' : 'hidden' }
  set visibility(val) { this._source.visible = val === 'visible' }
  get opacity() { return this._source.alpha }
  set opacity(val) { this._source.alpha = val }
  get backgroundColor() { return this._source.backgroundColor }
  set backgroundColor(val) { this._source.backgroundColor = val }

  /**
   * Filter
   */
  protected _filter?: string
  get filter() { return this._filter }
  set filter(val) {
    if (val !== this._filter) {
      this._filter = val
      const colorMatrix = this._source.colorMatrix.identity()
      this._parseFunctions(val ?? '').forEach(({ name, args }) => {
        switch (name) {
          case 'hue-rotate':
          case 'hueRotate':
            colorMatrix.hueRotate(args[0] * PI_2)
            break
          case 'saturate':
            colorMatrix.saturate(args[0])
            break
          case 'brightness':
            colorMatrix.brightness(args[0])
            break
          case 'contrast':
            colorMatrix.contrast(args[0])
            break
          case 'invert':
            colorMatrix.invert(args[0])
            break
          case 'sepia':
            colorMatrix.sepia(args[0])
            break
          case 'opacity':
            colorMatrix.opacity(args[0])
            break
          case 'grayscale':
            colorMatrix.grayscale(args[0])
            break
        }
      })
    }
  }

  constructor(
    protected _source: CanvasItem,
  ) {
    //
  }

  protected _parseFunctions(value: string): Array<{ name: string; args: Array<number> }> {
    const functions = []
    let match
    // eslint-disable-next-line no-cond-assign
    while ((match = FUNCTIONS_RE.exec(value)) !== null) {
      const [, name, args] = match
      if (name) {
        functions.push({
          name,
          args: this._parseValues(args),
        })
      }
    }
    return functions
  }

  protected _parseValues(value: string): Array<number> {
    const values = []
    let match
    // eslint-disable-next-line no-cond-assign
    while ((match = VALUES_RE.exec(value)) !== null) {
      values.push(this._normalrizeValue(match[0]))
    }
    return values
  }

  protected _normalrizeValue(value: string): number {
    const matched = value.match(VALUE_RE)
    const num = Number(matched?.[1])
    switch (matched?.[2]) {
      case '%':
        return num / 100
      case 'rad':
        return num / PI_2
      case 'deg':
        return num / 360
      case 'turn':
        return num
      case 'px':
        return num // div width or height
      case 'em':
        return num // div fontSize
      case 'rem':
        return num // div fontSize
      default:
        return num
    }
  }

  update(style: Partial<CanvasItemStyle>) {
    for (const key in style) {
      if (key in this) {
        (this as any)[key] = (style as any)[key]
      }
    }
  }
}

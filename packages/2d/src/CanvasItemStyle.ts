import { PI_2 } from '@rubickjs/math'
import { parseCssFunctions } from '@rubickjs/shared'
import type { CanvasItem } from './CanvasItem'

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
      parseCssFunctions(val ?? '').forEach(({ name, args }) => {
        const values = args.map(arg => arg.normalized)
        switch (name) {
          case 'hue-rotate':
          case 'hueRotate':
            colorMatrix.hueRotate(values[0] * PI_2)
            break
          case 'saturate':
            colorMatrix.saturate(values[0])
            break
          case 'brightness':
            colorMatrix.brightness(values[0])
            break
          case 'contrast':
            colorMatrix.contrast(values[0])
            break
          case 'invert':
            colorMatrix.invert(values[0])
            break
          case 'sepia':
            colorMatrix.sepia(values[0])
            break
          case 'opacity':
            colorMatrix.opacity(values[0])
            break
          case 'grayscale':
            colorMatrix.grayscale(values[0])
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

  update(style: Partial<CanvasItemStyle>) {
    for (const key in style) {
      if (key in this) {
        (this as any)[key] = (style as any)[key]
      }
    }
  }
}

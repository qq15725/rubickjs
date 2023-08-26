import type { CanvasItem } from '../../main'

export class CanvasItemStyle {
  get visibility() { return this._source.visible ? 'visible' : 'hidden' }
  set visibility(val) { this._source.visible = val === 'visible' }
  get opacity() { return this._source.alpha }
  set opacity(val) { this._source.alpha = val }
  get backgroundColor() { return this._source.backgroundColor }
  set backgroundColor(val) { this._source.backgroundColor = val }
  protected _filter?: string
  get filter() { return this._filter }
  set filter(val) {
    const colorMatrix = this._source.colorMatrix.identity()
    switch (val) {
      case 'contrast':
        colorMatrix.contrast()
        break
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

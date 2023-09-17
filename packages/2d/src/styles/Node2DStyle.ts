import { DEG_TO_RAD, RAD_TO_DEG } from '@rubickjs/math'
import { CanvasItemStyle } from './CanvasItemStyle'
import type { Node2D } from '../Node2D'

export class Node2DStyle extends CanvasItemStyle {
  get left() { return this._source.transform.position.x }
  set left(val) { this._source.transform.position.x = val }
  get top() { return this._source.transform.position.y }
  set top(val) { this._source.transform.position.y = val }
  get width() { return this._source.size.x }
  set width(val) { this._source.size.x = Math.round(val) }
  get height() { return this._source.size.y }
  set height(val) { this._source.size.y = Math.round(val) }
  get rotate() { return this._source.transform.rotation * RAD_TO_DEG }
  set rotate(val) { this._source.transform.rotation = val * DEG_TO_RAD }
  get transformOrigin() { return `${ this._source.transformOrigin[0] }, ${ this._source.transformOrigin[1] }` }
  set transformOrigin(val) {
    const [x, y] = val.split(',').map((val: string) => Number(val.trim()))
    this._source.transformOrigin.update(x, y)
  }

  constructor(
    protected _source: Node2D,
  ) {
    super(_source)
  }
}

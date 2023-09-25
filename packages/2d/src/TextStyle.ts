import { Node2DStyle } from './Node2DStyle'
import type { Text } from './Text'

export class TextStyle extends Node2DStyle {
  get color() { return this._source.color }
  set color(val) { this._source.color = val }
  get fontSize() { return this._source.fontSize }
  set fontSize(val) { this._source.fontSize = val }
  get fontWeight() { return this._source.fontWeight }
  set fontWeight(val) { this._source.fontWeight = val }
  get fontFamily() { return this._source.fontFamily }
  set fontFamily(val) { this._source.fontFamily = val }
  get fontStyle() { return this._source.fontStyle }
  set fontStyle(val) { this._source.fontStyle = val }
  get fontKerning() { return this._source.fontKerning }
  set fontKerning(val) { this._source.fontKerning = val }
  get textWrap() { return this._source.textWrap }
  set textWrap(val) { this._source.textWrap = val }
  get textAlign() { return this._source.textAlign }
  set textAlign(val) { this._source.textAlign = val }
  get textBaseline() { return this._source.textBaseline }
  set textBaseline(val) { this._source.textBaseline = val }
  get textDecoration() { return this._source.textDecoration }
  set textDecoration(val) { this._source.textDecoration = val }
  get direction() { return this._source.direction }
  set direction(val) { this._source.direction = val }

  constructor(
    protected _source: Text,
  ) {
    super(_source)
  }
}

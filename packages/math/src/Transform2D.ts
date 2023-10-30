import { PI_2 } from '@rubickjs/shared'
import { Matrix3 } from './Matrix3'

/**
 * Transform
 *
 * | a | c | tx|
 * | b | d | ty|
 * | 0 | 0 | 1 |
 */
export class Transform2D extends Matrix3 {
  protected _cx = 1
  protected _sx = 0
  protected _cy = 0
  protected _sy = 1
  protected _translateX = 0
  protected _translateY = 0
  protected _scaleX = 1
  protected _scaleY = 1
  protected _skewX = 0
  protected _skewY = 0
  protected _rotate = 0

  dirtyId = 0
  protected _needsUpdateArray = false
  protected _needsUpdateFields = false

  constructor(
    public autoUpdate = true,
  ) {
    super()
  }

  protected override _onUpdate(array: Array<number>): void {
    super._onUpdate(array)
    this._requestUpdateFields()
  }

  protected _updateSkew(): void {
    this._cx = Math.cos(this._rotate + this._skewY)
    this._sx = Math.sin(this._rotate + this._skewY)
    this._cy = -Math.sin(this._rotate - this._skewX) // cos, added PI/2
    this._sy = Math.cos(this._rotate - this._skewX) // sin, added PI/2
  }

  protected _requestUpdateArray() {
    if (this.autoUpdate) {
      this._performUpdateArray()
    } else {
      this._needsUpdateArray = true
    }
  }

  protected _requestUpdateFields() {
    if (this.autoUpdate) {
      this._performUpdateFields()
    } else {
      this._needsUpdateFields = true
    }
  }

  protected _performUpdateArray(): void {
    const a = this._cx * this._scaleX
    const b = this._sx * this._scaleX
    const c = this._cy * this._scaleY
    const d = this._sy * this._scaleY
    const tx = this._translateX
    const ty = this._translateY
    const array = this._array
    this._array = [
      a, c, tx,
      b, d, ty,
      array[6], array[7], array[8],
    ]
    this.dirtyId++
  }

  protected _performUpdateFields() {
    const [
      a, c, tx,
      b, d, ty,
    ] = this._array
    const skewX = -Math.atan2(-c, d)
    const skewY = Math.atan2(b, a)
    const delta = Math.abs(skewX + skewY)
    if (delta < 0.00001 || Math.abs(PI_2 - delta) < 0.00001) {
      this._rotate = skewY
      this._skewX = this._skewY = 0
    } else {
      this._rotate = 0
      this._skewX = skewX
      this._skewY = skewY
    }
    this._scaleX = Math.sqrt((a * a) + (b * b))
    this._scaleY = Math.sqrt((c * c) + (d * d))
    this._translateX = tx
    this._translateY = ty
    this.dirtyId++
  }

  translateX(x: number): this { return this.translate(x, this._translateY) }
  translateY(y: number): this { return this.translate(this._translateX, y) }
  scaleX(x: number): this { return this.scale(x, this._scaleY) }
  scaleY(y: number): this { return this.scale(this._scaleX, y) }
  skewX(x: number): this { return this.skew(x, this._skewY) }
  skewY(y: number): this { return this.skew(this._skewX, y) }

  skew(x: number, y: number): this {
    this._skewX = x
    this._skewY = y
    this._updateSkew()
    this._requestUpdateArray()
    return this
  }

  translate(x: number, y: number): this {
    this._translateX = x
    this._translateY = y
    this._requestUpdateArray()
    return this
  }

  scale(x: number, y: number): this {
    this._scaleX = x
    this._scaleY = y
    this._requestUpdateArray()
    return this
  }

  rotate(rad: number): this {
    this._rotate = rad
    this._updateSkew()
    this._requestUpdateArray()
    return this
  }

  applyToPoint(x: number, y: number): Array<number> {
    const [a, c, tx, b, d, ty] = this._array
    return [
      (a * x) + (c * y) + tx,
      (b * x) + (d * y) + ty,
    ]
  }

  inverse(): this {
    return this.clone().invert()
  }

  update(): boolean {
    let updated = false

    if (this._needsUpdateArray) {
      this._needsUpdateArray = false
      this._performUpdateArray()
      updated = true
    }

    if (this._needsUpdateFields) {
      this._needsUpdateFields = false
      this._performUpdateFields()
      updated = true
    }

    return updated
  }
}

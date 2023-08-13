import { Matrix3 } from './Matrix3'
import { ObservablePoint } from './ObservablePoint'

const PI_2 = Math.PI * 2

/**
 * Transform2D
 *
 * | a | c | tx|
 * | b | d | ty|
 * | 0 | 0 | 1 |
 */
export class Transform2D extends Matrix3 {
  /**
   * A default (identity) matrix
   *
   * @readonly
   */
  static get IDENTITY(): Transform2D { return new Transform2D() }

  /**
   * Dirty data needs to be updated
   */
  dirty = false

  /**
   * Transform's rotation (in radians)
   */
  protected _rotation = 0

  /**
   * The X-coordinate value of the normalized local X axis,
   * the first column of the local transformation matrix without a scale.
   */
  protected _cx = 1

  /**
   * The Y-coordinate value of the normalized local X axis,
   * the first column of the local transformation matrix without a scale.
   */
  protected _sx = 0

  /**
   * The X-coordinate value of the normalized local Y axis,
   * the second column of the local transformation matrix without a scale.
   */
  protected _cy = 0

  /**
   * The Y-coordinate value of the normalized local Y axis,
   * the second column of the local transformation matrix without a scale.
   */
  protected _sy = 1

  /**
   * The position
   */
  readonly position = new ObservablePoint(this._onUpdate, this, 0, 0)

  /**
   * The scale
   */
  readonly scale = new ObservablePoint(this._onUpdate, this, 1, 1)

  /**
   * Transform's skew (in radians)
   */
  readonly skew = new ObservablePoint(this._onUpdateSkew, this, 0, 0)

  /** The rotation of the object in radians. */
  get rotation(): number { return this._rotation }
  set rotation(val) {
    if (this._rotation !== val) {
      this._rotation = val
      this._onUpdateSkew()
    }
  }

  constructor(array?: ArrayLike<number>) {
    super(array)

    if (this.toString() !== '1,0,0,0,1,0,0,0,1') {
      this.sync()
    }
  }

  protected _onUpdate(): void {
    this.dirty = true
  }

  protected _onUpdateSkew(): void {
    this._cx = Math.cos(this._rotation + this.skew.y)
    this._sx = Math.sin(this._rotation + this.skew.y)
    this._cy = -Math.sin(this._rotation - this.skew.x) // cos, added PI/2
    this._sy = Math.cos(this._rotation - this.skew.x) // sin, added PI/2
    this.dirty = true
  }

  sync() {
    const [
      a, c, tx,
      b, d, ty,
    ] = this

    const skewX = -Math.atan2(-c, d)
    const skewY = Math.atan2(b, a)
    const delta = Math.abs(skewX + skewY)
    if (delta < 0.00001 || Math.abs(PI_2 - delta) < 0.00001) {
      this.rotation = skewY
      this.skew.x = this.skew.y = 0
    } else {
      this.rotation = 0
      this.skew.x = skewX
      this.skew.y = skewY
    }
    this.scale.x = Math.sqrt((a * a) + (b * b))
    this.scale.y = Math.sqrt((c * c) + (d * d))
    this.position.x = tx
    this.position.y = ty
  }

  /**
   * Returns a copy of the transform rotated by the given angle (in radians).
   *
   * @param angle (in radians)
   */
  rotated(angle: number): Transform2D {
    const cloned = this.clone()
    cloned.rotation = angle
    cloned.update()
    return cloned
  }

  /**
   * @param x
   * @param y
   */
  skewed(x: number, y: number): Transform2D {
    const cloned = this.clone()
    cloned.skew.set(x, y)
    cloned.update()
    return cloned
  }

  /**
   * Returns a copy of the transform scaled by the given scale factor.
   *
   * @param x
   * @param y
   */
  scaled(x: number, y: number): Transform2D {
    const cloned = this.clone()
    cloned.scale.set(x, y)
    cloned.update()
    return cloned
  }

  /**
   * Returns a copy of the transform translated by the given offset.
   *
   * @param x
   * @param y
   */
  translated(x: number, y: number): Transform2D {
    const cloned = this.clone()
    cloned.position.set(x, y)
    cloned.update()
    return cloned
  }

  inverse(): Transform2D {
    const cloned = this.clone().invert()
    this.sync()
    return cloned
  }

  clone(): Transform2D {
    return new Transform2D(this.toArray())
  }

  copy(value: ArrayLike<number>): this {
    this.set(Array.from(value))
    this.sync()
    return this
  }

  update(): boolean {
    if (!this.dirty) {
      return false
    }

    this.dirty = false

    const { x: scaleX, y: scaleY } = this.scale

    const a = this._cx * scaleX
    const b = this._sx * scaleX
    const c = this._cy * scaleY
    const d = this._sy * scaleY
    const tx = this.position.x
    const ty = this.position.y

    this.set([
      a, c, tx,
      b, d, ty,
      this[6], this[7], this[8],
    ])

    return true
  }
}

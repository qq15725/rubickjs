import { Vector } from './Vector'

/**
 * Vector2
 */
export class Vector2 extends Vector {
  get x() { return this[0] }
  set x(val) {
    if (this[0] !== val) {
      this[0] = val
      this._onUpdateCallback?.(this[0], this[1])
    }
  }

  get y() { return this[1] }
  set y(val) {
    if (this[1] !== val) {
      this[1] = val
      this._onUpdateCallback?.(this[0], this[1])
    }
  }

  get width() { return this.x }
  set width(val) { this.x = val }

  get height() { return this.y }
  set height(val) { this.y = val }

  constructor(x = 0, y = 0) {
    super(2)
    this[0] = x
    this[1] = y
  }

  override onUpdate(callback: (x: number, y: number) => void): this {
    this._onUpdateCallback = callback
    return this
  }

  update(x: number, y: number) {
    if (this[0] !== x || this[1] !== y) {
      this[0] = x
      this[1] = y
      this._onUpdateCallback?.(x, y)
    }
  }

  getLength(): number {
    const [x, y] = this
    return Math.sqrt(x * x + y * y)
  }

  getAngle(): number {
    return Math.atan2(-this[1], -this[0]) + Math.PI
  }

  normalize(): this {
    const scalar = 1 / (this.getLength() || 1)
    this[0] *= scalar
    this[1] *= scalar
    return this
  }
}

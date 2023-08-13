import { Vector } from './Vector'

/**
 * Vector2
 */
export class Vector2 extends Vector {
  get x() { return this[0] }
  set x(val) { this[0] = val }

  get y() { return this[1] }
  set y(val) { this[1] = val }

  get width() { return this[0] }
  set width(val) { this[0] = val }

  get height() { return this[1] }
  set height(val) { this[1] = val }

  constructor(x = 0, y = 0) {
    super(2)
    this[0] = x
    this[1] = y
  }

  override set(x: number | ArrayLike<number>, y?: number): this {
    if (typeof x === 'number') {
      this[0] = x
      this[1] = y ?? x
    } else {
      super.set(x, y)
    }
    return this
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

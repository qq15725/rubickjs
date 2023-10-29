import { Vector } from './Vector'

/**
 * Vector2
 */
export class Vector2 extends Vector {
  get x() { return this._array[0] }
  set x(val) {
    const [x, y] = this._array
    if (x !== val) {
      this.set([x, y])
    }
  }

  get y() { return this._array[1] }
  set y(val) {
    const [x, y] = this._array
    if (y !== val) {
      this.set([x, y])
    }
  }

  get width() { return this.x }
  set width(val) { this.x = val }

  get height() { return this.y }
  set height(val) { this.y = val }

  constructor(x = 0, y = 0) {
    super(2)
    this.set([x, y])
  }

  update(x: number, y: number) {
    const [oldX, oldY] = this._array
    if (oldX !== x || oldY !== y) {
      this.set([x, y])
    }
  }

  getLength(): number {
    const [x, y] = this._array
    return Math.sqrt(x * x + y * y)
  }

  getAngle(): number {
    const [x, y] = this._array
    return Math.atan2(-x, -y) + Math.PI
  }

  normalize(): this {
    const [x, y] = this._array
    const scalar = 1 / (this.getLength() || 1)
    this.set([x * scalar, y * scalar])
    return this
  }
}

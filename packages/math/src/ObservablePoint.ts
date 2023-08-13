export class ObservablePoint<T = any> {
  /** The callback function triggered when `x` and/or `y` are changed */
  cb: (this: T) => any

  /** The owner of the callback */
  scope: T

  _x: number
  _y: number

  /**
   * Creates a new `ObservablePoint`
   * @param cb - callback function triggered when `x` and/or `y` are changed
   * @param scope - owner of callback
   * @param {number} [x=0] - position of the point on the x axis
   * @param {number} [y=0] - position of the point on the y axis
   */
  constructor(cb: (this: T) => any, scope: T, x = 0, y = 0) {
    this._x = x
    this._y = y

    this.cb = cb
    this.scope = scope
  }

  /**
   * Copy target point to this point.
   * @param target
   */
  copy(target: { x: number; y: number }): this {
    const { x, y } = target
    if (this._x !== x || this._y !== y) {
      this._x = x
      this._y = y
      this.cb.call(this.scope)
    }
    return this
  }

  /**
   * Creates a clone of this point.
   * The callback and scope params can be overridden otherwise they will default
   * to the clone object's values.
   * @param cb - The callback function triggered when `x` and/or `y` are changed
   * @param scope - The owner of the callback
   * @returns a copy of this observable point
   */
  clone(cb = this.cb, scope = this.scope): ObservablePoint {
    return new ObservablePoint(cb, scope, this._x, this._y)
  }

  /**
   * Sets the point to a new `x` and `y` position.
   * If `y` is omitted, both `x` and `y` will be set to `x`.
   * @param {number} [x=0] - position of the point on the x axis
   * @param {number} [y=x] - position of the point on the y axis
   * @returns The observable point instance itself
   */
  set(x = 0, y = x): this {
    if (this._x !== x || this._y !== y) {
      this._x = x
      this._y = y
      this.cb.call(this.scope)
    }

    return this
  }

  /** Position of the observable point on the x axis. */
  get x(): number { return this._x }
  set x(value: number) {
    if (this._x !== value) {
      this._x = value
      this.cb.call(this.scope)
    }
  }

  /** Position of the observable point on the y axis. */
  get y(): number { return this._y }
  set y(value: number) {
    if (this._y !== value) {
      this._y = value
      this.cb.call(this.scope)
    }
  }
}

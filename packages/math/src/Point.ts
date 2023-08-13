export class Point {
  constructor(
    public x = 0,
    public y = 0,
  ) {
    //
  }

  clone(): Point {
    return new Point(this.x, this.y)
  }

  set(x = 0, y = 0): this {
    this.x = x
    this.y = y
    return this
  }
}

import { Shape } from './Shape'

export class Rect extends Shape {
  constructor(
    public x = 0,
    public y = 0,
    public width = 0,
    public height = 0,
  ) {
    super()
  }

  fit(rect: Rect): this {
    const x1 = Math.max(this.x, rect.x)
    const x2 = Math.min(this.x + this.width, rect.x + rect.width)
    const y1 = Math.max(this.y, rect.y)
    const y2 = Math.min(this.y + this.height, rect.y + rect.height)
    this.x = x1
    this.width = Math.max(x2 - x1, 0)
    this.y = y1
    this.height = Math.max(y2 - y1, 0)
    return this
  }

  override buildContour(points: Array<number>): void {
    const { x, y, width, height } = this
    points.push(
      x, y,
      x + width, y,
      x + width, y + height,
      x, y + height,
    )
  }

  override buildGeometry(
    vertices: Array<number>,
    indices: Array<number>,
  ): void {
    this.buildContour(vertices)
    indices.push(0, 1, 2, 0, 2, 3)
  }
}

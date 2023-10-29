import { Round } from './Round'
import { Shape } from './Shape'

export class Polygon extends Shape {
  constructor(
    public points: Array<number> = [],
    public closed = false,
  ) {
    super()
  }

  reset(): this {
    this.points.length = 0
    this.closed = false
    return this
  }

  clone(): Polygon {
    return new Polygon(this.points, this.closed)
  }

  override buildContour(points: Array<number>): void {
    for (let len = this.points.length, i = 0; i < len; i++) {
      points.push(this.points[i])
    }
  }

  override buildGeometry(
    vertices: Array<number>,
    indices: Array<number>,
  ): void {
    Round.buildGeometry(
      this.points[0], this.points[1], this.points,
      vertices, indices,
    )
  }
}

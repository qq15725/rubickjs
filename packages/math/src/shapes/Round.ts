import { Shape } from './Shape'
import type { Transform2D } from '../Transform2D'

export class Round extends Shape {
  static buildContour(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    dx: number,
    dy: number,
    points: Array<number>,
  ): void {
    if (!(rx >= 0 && ry >= 0 && dx >= 0 && dy >= 0)) return

    // Choose a number of segments such that the maximum absolute deviation from the circle is approximately 0.029
    const n = Math.ceil(2.3 * Math.sqrt(rx + ry))
    const m = (n * 8) + (dx ? 4 : 0) + (dy ? 4 : 0)

    points.length = m

    if (m === 0) return

    if (n === 0) {
      points.length = 8
      points[0] = points[6] = cx + dx
      points[1] = points[3] = cy + dy
      points[2] = points[4] = cx - dx
      points[5] = points[7] = cy - dy
      return
    }

    let j1 = 0
    let j2 = (n * 4) + (dx ? 2 : 0) + 2
    let j3 = j2
    let j4 = m

    {
      const x0 = dx + rx
      const y0 = dy
      const x1 = cx + x0
      const x2 = cx - x0
      const y1 = cy + y0

      points[j1++] = x1
      points[j1++] = y1
      points[--j2] = y1
      points[--j2] = x2

      if (dy) {
        const y2 = cy - y0

        points[j3++] = x2
        points[j3++] = y2
        points[--j4] = y2
        points[--j4] = x1
      }
    }

    for (let i = 1; i < n; i++) {
      const a = Math.PI / 2 * (i / n)
      const x0 = dx + (Math.cos(a) * rx)
      const y0 = dy + (Math.sin(a) * ry)
      const x1 = cx + x0
      const x2 = cx - x0
      const y1 = cy + y0
      const y2 = cy - y0

      points[j1++] = x1
      points[j1++] = y1
      points[--j2] = y1
      points[--j2] = x2
      points[j3++] = x2
      points[j3++] = y2
      points[--j4] = y2
      points[--j4] = x1
    }

    {
      const x0 = dx
      const y0 = dy + ry
      const x1 = cx + x0
      const x2 = cx - x0
      const y1 = cy + y0
      const y2 = cy - y0

      points[j1++] = x1
      points[j1++] = y1
      points[--j4] = y2
      points[--j4] = x1

      if (dx) {
        points[j1++] = x2
        points[j1++] = y1
        points[--j4] = y2
        points[--j4] = x2
      }
    }
  }

  static buildGeometry(
    cx: number,
    cy: number,
    points: Array<number>,
    vertices: Array<number>,
    indices: Array<number>,
    transform?: Transform2D,
  ): void {
    let pos = 0
    const centerPos = pos++
    if (transform) {
      const [
        a, c, tx,
        b, d, ty,
      ] = transform.toArray()

      vertices.push(
        (a * cx) + (c * cy) + tx,
        (b * cx) + (d * cy) + ty,
      )
    } else {
      vertices.push(cx, cy)
    }

    vertices.push(points[0], points[1])

    for (let i = 2; i < points.length; i += 2) {
      vertices.push(points[i], points[i + 1])
      indices.push(pos++, centerPos, pos)
    }

    indices.push(1, centerPos, pos)
  }

  constructor(
    public cx = 0,
    public cy = 0,
    public rx = 0,
    public ry = 0,
    public dx = 0,
    public dy = 0,
  ) {
    super()
  }

  override buildContour(points: Array<number>): void {
    Round.buildContour(
      this.cx, this.cy, this.rx, this.ry, this.dx, this.dy,
      points,
    )
  }

  override buildGeometry(
    vertices: Array<number>,
    indices: Array<number>,
  ): void {
    const points: Array<number> = []
    this.buildContour(points)
    Round.buildGeometry(
      this.cx, this.cy, points,
      vertices, indices,
    )
  }
}

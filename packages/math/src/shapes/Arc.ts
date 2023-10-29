import { PI_2, curves } from '../utils'
import { Round } from './Round'
import { Shape } from './Shape'

export class Arc extends Shape {
  static buildContour(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    startAngle: number,
    endAngle: number,
    counterclockwise: boolean,
    eps: number,
    points: Array<number>,
  ): void {
    if (startAngle === endAngle) {
      return
    }

    if (!counterclockwise && endAngle <= startAngle) {
      endAngle += PI_2
    } else if (counterclockwise && startAngle <= endAngle) {
      startAngle += PI_2
    }

    const sweep = endAngle - startAngle

    if (sweep === 0) {
      return
    }

    const startX = cx + (Math.cos(startAngle) * rx)
    const startY = cy + (Math.sin(startAngle) * ry)
    if (
      Math.abs(points[points.length - 2] - startX) > eps
      || Math.abs(points[points.length - 1] - startY) > eps
    ) {
      points.push(startX, startY)
    }

    const n = curves._segmentsCount(
      Math.abs(sweep) * Math.max(rx, ry),
      Math.ceil(Math.abs(sweep) / PI_2) * 40,
    )
    const theta = sweep / (n * 2)
    const theta2 = theta * 2
    const cTheta = Math.cos(theta)
    const sTheta = Math.sin(theta)
    const segMinus = n - 1
    const remainder = (segMinus % 1) / segMinus

    for (let i = 0; i <= segMinus; ++i) {
      const real = i + remainder * i
      const angle = theta + startAngle + (theta2 * real)
      const c = Math.cos(angle)
      const s = -Math.sin(angle)

      points.push(
        ((cTheta * c + sTheta * s) * rx) + cx,
        ((cTheta * -s + sTheta * c) * ry) + cy,
      )
    }
  }

  constructor(
    public cx = 0,
    public cy = 0,
    public rx = 0,
    public ry = 0,
    public startAngle = 0,
    public endAngle = PI_2,
    public counterclockwise = false,
  ) {
    super()
  }

  override buildContour(points: Array<number>, eps = 1e-4): void {
    Arc.buildContour(
      this.cx, this.cy, this.rx, this.ry,
      this.startAngle, this.endAngle,
      this.counterclockwise, eps,
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

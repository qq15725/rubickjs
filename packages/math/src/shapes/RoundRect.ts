import { Round } from './Round'

export class RoundRect extends Round {
  public constructor(
    public x = 0,
    public y = 0,
    public width = 0,
    public height = 0,
    public radius = width / 4,
  ) {
    super()
    this._update()
  }

  protected _update() {
    const halfWidth = this.width / 2
    const halfHeight = this.height / 2
    this.ry = Math.max(0, Math.min(this.radius, Math.min(halfWidth, halfHeight)))
    this.rx = this.ry
    this.dx = halfWidth - this.rx
    this.dy = halfHeight - this.ry
    this.cx = this.x + halfWidth
    this.cy = this.y + halfHeight
  }

  override buildContour(points: Array<number>): void {
    this._update()
    super.buildContour(points)
  }
}

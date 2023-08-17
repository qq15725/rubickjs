import { Matrix3 } from './Matrix3'
import { Vector2 } from './Vector2'

export class Projection2D extends Matrix3 {
  /**
   * x and y
   */
  readonly position: Vector2

  /**
   * width and height
   */
  readonly size: Vector2

  constructor(
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    public flipY = false,
  ) {
    super()
    this.position = new Vector2(x, y).onUpdate(this._onUpdate.bind(this))
    this.size = new Vector2(width, height).onUpdate(this._onUpdate.bind(this))
  }

  protected _onUpdate() {
    const { x, y } = this.position
    const { x: width, y: height } = this.size

    if (!width || !height) {
      return
    }

    const sign = !this.flipY ? 1 : -1
    const a = 1 / width * 2
    const d = sign * (1 / height * 2)
    const tx = -1 - (x * a)
    const ty = -sign - (y * d)

    this.set([
      a, 0, tx,
      0, d, ty,
      0, 0, 1,
    ])
  }
}

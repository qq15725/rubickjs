/**
 * Matrix3(3x3)
 *
 * | x0 | y0 | z0 |
 * | x1 | y1 | z1 |
 * | x2 | y2 | z2 |
 */
import { Matrix } from './Matrix'

export class Matrix3 extends Matrix {
  constructor(array?: ArrayLike<number>) {
    super(3, 3, array)
  }

  invert(): this {
    const [
      n11, n21, n31,
      n12, n22, n32,
      n13, n23, n33,
    ] = this
    const t11 = n33 * n22 - n32 * n23
    const t12 = n32 * n13 - n33 * n12
    const t13 = n23 * n12 - n22 * n13
    const det = n11 * t11 + n21 * t12 + n31 * t13
    if (det === 0) {
      this.set([0, 0, 0, 0, 0, 0, 0, 0, 0])
      return this
    }
    const detInv = 1 / det
    this[0] = t11 * detInv
    this[1] = (n31 * n23 - n33 * n21) * detInv
    this[2] = (n32 * n21 - n31 * n22) * detInv
    this[3] = t12 * detInv
    this[4] = (n33 * n11 - n31 * n13) * detInv
    this[5] = (n31 * n12 - n32 * n11) * detInv
    this[6] = t13 * detInv
    this[7] = (n21 * n13 - n23 * n11) * detInv
    this[8] = (n22 * n11 - n21 * n12) * detInv
    return this
  }
}

import { Matrix } from './Matrix'

/**
 * Matrix4(4x4)
 *
 * | x0 | y0 | z0 |
 * | x1 | y1 | z1 |
 * | x2 | y2 | z2 |
 */
export class Matrix4 extends Matrix {
  constructor(array?: ArrayLike<number>) {
    super(2, 2, array)
  }
}

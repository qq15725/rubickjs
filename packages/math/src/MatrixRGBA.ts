import { Matrix } from './Matrix'

/**
 * Matrix4(4x5)
 *
 * | r0 | g0 | b0 | a0 | tr |
 * | r1 | g1 | b1 | a1 | tg |
 * | r2 | g2 | b2 | a2 | tb |
 * | r3 | g3 | b3 | a3 | ta |
 */
export class MatrixRGBA extends Matrix {
  constructor(array?: ArrayLike<number>) {
    super(4, 5, array)
  }
}

import { Vector } from './Vector'

/**
 * Vector4
 */
export class Vector4 extends Vector {
  constructor(x = 0, y = 0, z = 0, m = 0) {
    super(4)
    this[0] = x
    this[1] = y
    this[2] = z
    this[3] = m
  }
}

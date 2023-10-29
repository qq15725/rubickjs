import { Vector } from './Vector'

/**
 * Vector3
 */
export class Vector3 extends Vector {
  constructor(x = 0, y = 0, z = 0) {
    super(3)
    this.set([x, y, z])
  }
}

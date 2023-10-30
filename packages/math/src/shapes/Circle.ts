import { PI_2 } from '@rubickjs/shared'
import { Arc } from './Arc'

export class Circle extends Arc {
  constructor(
    x = 0,
    y = 0,
    radius = 0,
  ) {
    super(x, y, radius, radius, 0, PI_2)
  }
}

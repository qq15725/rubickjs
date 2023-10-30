import { PI_2 } from '@rubickjs/shared'
import { Arc } from './Arc'

export class Ellipse extends Arc {
  constructor(
    cx = 0,
    cy = 0,
    rx = 0,
    ry = 0,
    public rotation = 0,
    startAngle = 0,
    endAngle = PI_2,
    counterclockwise = false,
  ) {
    super(cx, cy, rx, ry, startAngle, endAngle, counterclockwise)
  }
}

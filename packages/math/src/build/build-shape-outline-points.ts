import { Vector2 } from '../Vector2'
import { Circle, Ellipse, Polygon, Rectangle, RoundedRectangle } from '../shapes'
import { buildCircularOutlinePoints } from './build-circular-outline-points'
import type { Shape } from '../shapes'

export function buildShapeOutlinePoints(shape: Shape): number[] {
  if (shape instanceof Circle) {
    return buildCircularOutlinePoints(
      new Vector2(shape.x, shape.y),
      new Vector2(shape.radius, shape.radius),
      new Vector2(0, 0),
    )
  }

  if (shape instanceof Ellipse) {
    return buildCircularOutlinePoints(
      new Vector2(shape.x, shape.y),
      new Vector2(shape.width, shape.height),
      new Vector2(0, 0),
    )
  }

  if (shape instanceof Rectangle) {
    return [
      shape.x, shape.y,
      shape.x + shape.width, shape.y,
      shape.x, shape.y + shape.height,
      shape.x + shape.width, shape.y + shape.height,
    ]
  }

  if (shape instanceof RoundedRectangle) {
    const halfWidth = shape.width / 2
    const halfHeight = shape.height / 2
    const x = shape.x + halfWidth
    const y = shape.y + halfHeight
    const ry = Math.max(0, Math.min(shape.radius, Math.min(halfWidth, halfHeight)))
    const rx = ry
    const dx = halfWidth - rx
    const dy = halfHeight - ry
    return buildCircularOutlinePoints(
      new Vector2(x, y),
      new Vector2(rx, ry),
      new Vector2(dx, dy),
    )
  }

  if (shape instanceof Polygon) {
    return shape.points
  }

  return []
}

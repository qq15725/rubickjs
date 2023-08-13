import { Vector2 } from '../Vector2'
import { Circle, Ellipse, Polygon, Rectangle, RoundedRectangle } from '../shapes'
import { buildFillRectangle } from './build-fill-rectangle'
import { buildFillCircular } from './build-fill-circular'
import { buildFillLine } from './build-fill-line'
import { buildShapeOutlinePoints } from './build-shape-outline-points'
import type { Shape } from '../shapes'

export function buildFillShape(shape: Shape, line = false) {
  const points = buildShapeOutlinePoints(shape)

  if (shape instanceof Circle) {
    if (line) {
      return buildFillLine(points)
    } else {
      return buildFillCircular(
        new Vector2(shape.x, shape.y),
        points,
      )
    }
  }

  if (shape instanceof Ellipse) {
    if (line) {
      return buildFillLine(points)
    } else {
      return buildFillCircular(
        new Vector2(shape.x, shape.y),
        points,
      )
    }
  }

  if (shape instanceof Rectangle) {
    if (line) {
      return buildFillLine(points)
    } else {
      return buildFillRectangle(shape.x, shape.y, shape.width, shape.height)
    }
  }

  if (shape instanceof RoundedRectangle) {
    if (line) {
      return buildFillLine(points)
    } else {
      return buildFillCircular(
        new Vector2(shape.x + (shape.width / 2), shape.y + (shape.height / 2)),
        points,
      )
    }
  }

  if (shape instanceof Polygon) {
    if (line) {
      return buildFillLine(points, {
        alignment: 0.5,
        width: 10,
        cap: 'round',
        join: 'round',
        miterLimit: 10,
      }, shape.closeStroke)
    } else {
      return buildFillCircular(
        new Vector2(points[0], points[1]),
        points,
      )
    }
  }

  return {
    vertices: [],
    indices: [],
  }
}

import type { Vector2 } from '../Vector2'
import type { Transform2D } from '../Transform2D'

export function buildFillCircular(
  center: Vector2,
  points: number[],
  transform?: Transform2D,
) {
  const vertices: number[] = []
  const indices: number[] = []

  let pos = 0
  const centerPos = pos++
  if (transform) {
    const [
      a, c, tx,
      b, d, ty,
    ] = transform

    vertices.push(
      (a * center.x) + (c * center.y) + tx,
      (b * center.x) + (d * center.y) + ty,
    )
  } else {
    vertices.push(center.x, center.y)
  }

  vertices.push(points[0], points[1])

  for (let i = 2; i < points.length; i += 2) {
    vertices.push(points[i], points[i + 1])
    indices.push(pos++, centerPos, pos)
  }

  indices.push(1, centerPos, pos)

  return {
    vertices,
    indices,
  }
}

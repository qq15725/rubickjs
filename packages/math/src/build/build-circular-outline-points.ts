import type { Vector2 } from '../Vector2'

export function buildCircularOutlinePoints(center: Vector2, radius: Vector2, dist: Vector2): number[] {
  const points: number[] = []

  if (!(radius.x >= 0 && radius.y >= 0 && dist.x >= 0 && dist.y >= 0)) return points

  // Choose a number of segments such that the maximum absolute deviation from the circle is approximately 0.029
  const n = Math.ceil(2.3 * Math.sqrt(radius.x + radius.y))
  const m = (n * 8) + (dist.x ? 4 : 0) + (dist.y ? 4 : 0)

  points.length = m

  if (m === 0) return points

  if (n === 0) {
    points.length = 8
    points[0] = points[6] = center.x + dist.x
    points[1] = points[3] = center.y + dist.y
    points[2] = points[4] = center.x - dist.x
    points[5] = points[7] = center.y - dist.y
    return points
  }

  let j1 = 0
  let j2 = (n * 4) + (dist.x ? 2 : 0) + 2
  let j3 = j2
  let j4 = m

  {
    const x0 = dist.x + radius.x
    const y0 = dist.y
    const x1 = center.x + x0
    const x2 = center.x - x0
    const y1 = center.y + y0

    points[j1++] = x1
    points[j1++] = y1
    points[--j2] = y1
    points[--j2] = x2

    if (dist.y) {
      const y2 = center.y - y0

      points[j3++] = x2
      points[j3++] = y2
      points[--j4] = y2
      points[--j4] = x1
    }
  }

  for (let i = 1; i < n; i++) {
    const a = Math.PI / 2 * (i / n)
    const x0 = dist.x + (Math.cos(a) * radius.x)
    const y0 = dist.y + (Math.sin(a) * radius.y)
    const x1 = center.x + x0
    const x2 = center.x - x0
    const y1 = center.y + y0
    const y2 = center.y - y0

    points[j1++] = x1
    points[j1++] = y1
    points[--j2] = y1
    points[--j2] = x2
    points[j3++] = x2
    points[j3++] = y2
    points[--j4] = y2
    points[--j4] = x1
  }

  {
    const x0 = dist.x
    const y0 = dist.y + radius.y
    const x1 = center.x + x0
    const x2 = center.x - x0
    const y1 = center.y + y0
    const y2 = center.y - y0

    points[j1++] = x1
    points[j1++] = y1
    points[--j4] = y2
    points[--j4] = x1

    if (dist.x) {
      points[j1++] = x2
      points[j1++] = y1
      points[--j4] = y2
      points[--j4] = x2
    }
  }

  return points
}

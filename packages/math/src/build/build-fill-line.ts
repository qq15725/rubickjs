export function buildFillLine(
  points: number[],
  style: {
    alignment: number
    width: number
    cap: 'butt' | 'round' | 'square'
    join: 'miter' | 'bevel' | 'round'
    miterLimit: number
  } = {
    alignment: 0.5,
    width: 10,
    cap: 'butt',
    join: 'miter',
    miterLimit: 10,
  },
  closedShape = true,
  closePointEps = 1e-4,
) {
  const vertices: Array<number> = []
  const indices: Array<number> = []

  if (points.length < 4) return { vertices, indices }

  const eps = closePointEps

  // Max. inner and outer width
  const width = style.width / 2
  const widthSquared = width * width
  const miterLimitSquared = style.miterLimit * style.miterLimit
  const ratio = style.alignment
  const innerWeight = (1 - ratio) * 2
  const outerWeight = ratio * 2

  // get first and last point.. figure out the middle!
  const firstPoint = { x: points[0], y: points[1] }
  const lastPoint = { x: points[points.length - 2], y: points[points.length - 1] }
  // const closedShape = shape.type !== SHAPES.POLY || shape.closeStroke
  const closedPath = Math.abs(firstPoint.x - lastPoint.x) < eps
    && Math.abs(firstPoint.y - lastPoint.y) < eps

  // if the first point is the last point - gonna have issues :)
  if (closedShape) {
    // need to clone as we are going to slightly modify the shape..
    points = points.slice()

    if (closedPath) {
      points.pop()
      points.pop()
      lastPoint.x = points[points.length - 2]
      lastPoint.y = points[points.length - 1]
    }

    const midPointX = (firstPoint.x + lastPoint.x) * 0.5
    const midPointY = (lastPoint.y + firstPoint.y) * 0.5

    points.unshift(midPointX, midPointY)
    points.push(midPointX, midPointY)
  }

  const length = points.length / 2
  let indexCount = points.length

  // Line segments of interest where (x1,y1) forms the corner.
  let x0 = points[0]
  let y0 = points[1]
  let x1 = points[2]
  let y1 = points[3]
  let x2 = 0
  let y2 = 0

  // perp[?](x|y) = the line normal with magnitude lineWidth.
  let perpx = -(y0 - y1)
  let perpy = x0 - x1
  let perp1x = 0
  let perp1y = 0

  let dist = Math.sqrt((perpx * perpx) + (perpy * perpy))
  perpx /= dist
  perpy /= dist
  perpx *= width
  perpy *= width

  if (!closedShape) {
    if (style.cap === 'round') {
      indexCount += round(
        x0 - (perpx * (innerWeight - outerWeight) * 0.5),
        y0 - (perpy * (innerWeight - outerWeight) * 0.5),
        x0 - (perpx * innerWeight),
        y0 - (perpy * innerWeight),
        x0 + (perpx * outerWeight),
        y0 + (perpy * outerWeight),
        vertices,
        true,
      ) + 2
    } else if (style.cap === 'square') {
      indexCount += square(
        x0,
        y0,
        perpx,
        perpy,
        innerWeight,
        outerWeight,
        true,
        vertices,
      )
    }
  }

  // Push first point (below & above vertices)
  vertices.push(
    x0 - (perpx * innerWeight), y0 - (perpy * innerWeight),
    x0 + (perpx * outerWeight), y0 + (perpy * outerWeight),
  )

  for (let i = 1; i < length - 1; ++i) {
    x0 = points[(i - 1) * 2]
    y0 = points[((i - 1) * 2) + 1]
    x1 = points[i * 2]
    y1 = points[(i * 2) + 1]
    x2 = points[(i + 1) * 2]
    y2 = points[((i + 1) * 2) + 1]

    perpx = -(y0 - y1)
    perpy = x0 - x1

    dist = Math.sqrt((perpx * perpx) + (perpy * perpy))
    perpx /= dist
    perpy /= dist
    perpx *= width
    perpy *= width

    perp1x = -(y1 - y2)
    perp1y = x1 - x2

    dist = Math.sqrt((perp1x * perp1x) + (perp1y * perp1y))
    perp1x /= dist
    perp1y /= dist
    perp1x *= width
    perp1y *= width

    // d[x|y](0|1) = the component displacement between points p(0,1|1,2)
    const dx0 = x1 - x0
    const dy0 = y0 - y1
    const dx1 = x1 - x2
    const dy1 = y2 - y1

    // +ve if internal angle < 90 degree, -ve if internal angle > 90 degree.
    const dot = (dx0 * dx1) + (dy0 * dy1)
    // +ve if internal angle counterclockwise, -ve if internal angle clockwise.
    const cross = (dy0 * dx1) - (dy1 * dx0)
    const clockwise = (cross < 0)

    // Going nearly parallel?
    // atan(0.001) ~= 0.001 rad ~= 0.057 degree
    if (Math.abs(cross) < 0.001 * Math.abs(dot)) {
      vertices.push(
        x1 - (perpx * innerWeight), y1 - (perpy * innerWeight),
        x1 + (perpx * outerWeight), y1 + (perpy * outerWeight),
      )

      // 180 degree corner?
      if (dot >= 0) {
        if (style.join === 'round') {
          indexCount += round(
            x1, y1,
            x1 - (perpx * innerWeight), y1 - (perpy * innerWeight),
            x1 - (perp1x * innerWeight), y1 - (perp1y * innerWeight),
            vertices,
            false,
          ) + 4
        } else {
          indexCount += 2
        }

        vertices.push(
          x1 - (perp1x * outerWeight), y1 - (perp1y * outerWeight),
          x1 + (perp1x * innerWeight), y1 + (perp1y * innerWeight),
        )
      }

      continue
    }

    // p[x|y] is the miter point. pdist is the distance between miter point and p1.
    const c1 = ((-perpx + x0) * (-perpy + y1)) - ((-perpx + x1) * (-perpy + y0))
    const c2 = ((-perp1x + x2) * (-perp1y + y1)) - ((-perp1x + x1) * (-perp1y + y2))
    const px = ((dx0 * c2) - (dx1 * c1)) / cross
    const py = ((dy1 * c1) - (dy0 * c2)) / cross
    const pdist = ((px - x1) * (px - x1)) + ((py - y1) * (py - y1))

    // Inner miter point
    const imx = x1 + ((px - x1) * innerWeight)
    const imy = y1 + ((py - y1) * innerWeight)
    // Outer miter point
    const omx = x1 - ((px - x1) * outerWeight)
    const omy = y1 - ((py - y1) * outerWeight)

    // Is the inside miter point too far away, creating a spike?
    const smallerInsideSegmentSq = Math.min((dx0 * dx0) + (dy0 * dy0), (dx1 * dx1) + (dy1 * dy1))
    const insideWeight = clockwise ? innerWeight : outerWeight
    const smallerInsideDiagonalSq = smallerInsideSegmentSq + (insideWeight * insideWeight * widthSquared)
    const insideMiterOk = pdist <= smallerInsideDiagonalSq

    let join = style.join

    if (join === 'miter' && pdist / widthSquared > miterLimitSquared) {
      join = 'bevel'
    }

    if (insideMiterOk) {
      switch (join) {
        case 'miter':
          vertices.push(
            imx, imy,
            omx, omy,
          )
          break
        case 'bevel':
          // rotating at inner angle
          if (clockwise) {
            vertices.push(
              imx, imy, // inner miter point
              x1 + (perpx * outerWeight), y1 + (perpy * outerWeight), // first segment's outer vertex
              imx, imy, // inner miter point
              x1 + (perp1x * outerWeight), y1 + (perp1y * outerWeight),
            )
            // second segment's outer vertex
          } else {
            // rotating at outer angle
            vertices.push(
              x1 - (perpx * innerWeight), y1 - (perpy * innerWeight), // first segment's inner vertex
              omx, omy, // outer miter point
              x1 - (perp1x * innerWeight), y1 - (perp1y * innerWeight), // second segment's outer vertex
              omx, omy,
            ) // outer miter point
          }

          indexCount += 2
          break
        case 'round':
          // arc is outside
          if (clockwise) {
            vertices.push(
              imx, imy,
              x1 + (perpx * outerWeight), y1 + (perpy * outerWeight),
            )

            indexCount += round(
              x1, y1,
              x1 + (perpx * outerWeight), y1 + (perpy * outerWeight),
              x1 + (perp1x * outerWeight), y1 + (perp1y * outerWeight),
              vertices, true,
            ) + 4

            vertices.push(
              imx, imy,
              x1 + (perp1x * outerWeight), y1 + (perp1y * outerWeight),
            )
          } else {
            // arc is inside
            vertices.push(
              x1 - (perpx * innerWeight), y1 - (perpy * innerWeight),
              omx, omy,
            )

            indexCount += round(
              x1, y1,
              x1 - (perpx * innerWeight), y1 - (perpy * innerWeight),
              x1 - (perp1x * innerWeight), y1 - (perp1y * innerWeight),
              vertices, false,
            ) + 4

            vertices.push(
              x1 - (perp1x * innerWeight), y1 - (perp1y * innerWeight),
              omx, omy,
            )
          }
          break
      }
    } else {
      // inside miter is NOT ok
      vertices.push(
        x1 - (perpx * innerWeight), y1 - (perpy * innerWeight), // first segment's inner vertex
        x1 + (perpx * outerWeight), y1 + (perpy * outerWeight),
      )
      // first segment's outer vertex
      switch (join) {
        case 'miter':
          if (clockwise) {
            vertices.push(
              omx, omy, // inner miter point
              omx, omy,
            ) // inner miter point
          } else {
            vertices.push(
              imx, imy, // outer miter point
              imx, imy,
            ) // outer miter point
          }
          indexCount += 2
          break
        case 'round':
          // arc is outside
          if (clockwise) {
            indexCount += round(
              x1, y1,
              x1 + (perpx * outerWeight), y1 + (perpy * outerWeight),
              x1 + (perp1x * outerWeight), y1 + (perp1y * outerWeight),
              vertices, true,
            ) + 2
          } else {
            // arc is inside
            indexCount += round(
              x1, y1,
              x1 - (perpx * innerWeight), y1 - (perpy * innerWeight),
              x1 - (perp1x * innerWeight), y1 - (perp1y * innerWeight),
              vertices, false,
            ) + 2
          }
          break
      }
      vertices.push(
        x1 - (perp1x * innerWeight), y1 - (perp1y * innerWeight), // second segment's inner vertex
        x1 + (perp1x * outerWeight), y1 + (perp1y * outerWeight),
      )
      // second segment's outer vertex
      indexCount += 2
    }
  }

  x0 = points[(length - 2) * 2]
  y0 = points[((length - 2) * 2) + 1]

  x1 = points[(length - 1) * 2]
  y1 = points[((length - 1) * 2) + 1]

  perpx = -(y0 - y1)
  perpy = x0 - x1

  dist = Math.sqrt((perpx * perpx) + (perpy * perpy))
  perpx /= dist
  perpy /= dist
  perpx *= width
  perpy *= width

  vertices.push(
    x1 - (perpx * innerWeight), y1 - (perpy * innerWeight),
    x1 + (perpx * outerWeight), y1 + (perpy * outerWeight),
  )

  if (!closedShape) {
    if (style.cap === 'round') {
      indexCount += round(
        x1 - (perpx * (innerWeight - outerWeight) * 0.5),
        y1 - (perpy * (innerWeight - outerWeight) * 0.5),
        x1 - (perpx * innerWeight),
        y1 - (perpy * innerWeight),
        x1 + (perpx * outerWeight),
        y1 + (perpy * outerWeight),
        vertices,
        false,
      ) + 2
    } else if (style.cap === 'square') {
      indexCount += square(x1, y1, perpx, perpy, innerWeight, outerWeight, false, vertices)
    }
  }

  const eps2 = 0.0001 * 0.0001

  for (let i = 0; i < indexCount - 2; ++i) {
    x0 = vertices[(i * 2)]
    y0 = vertices[(i * 2) + 1]

    x1 = vertices[(i + 1) * 2]
    y1 = vertices[((i + 1) * 2) + 1]

    x2 = vertices[(i + 2) * 2]
    y2 = vertices[((i + 2) * 2) + 1]

    // Skip zero area triangles
    if (Math.abs((x0 * (y1 - y2)) + (x1 * (y2 - y0)) + (x2 * (y0 - y1))) < eps2) {
      continue
    }

    indices.push(i, i + 1, i + 2)
  }

  return {
    vertices,
    indices,
  }
}

/**
 * Buffers vertices to draw a square cap.
 *
 * @param {number} x - X-coord of end point
 * @param {number} y - Y-coord of end point
 * @param {number} nx - X-coord of line normal pointing inside
 * @param {number} ny - Y-coord of line normal pointing inside
 * @param {number} innerWeight - Weight of inner points
 * @param {number} outerWeight - Weight of outer points
 * @param {boolean} clockwise - Whether the cap is drawn clockwise
 * @param {Array<number>} vertices - vertex buffer
 * @returns {number} - no. of vertices pushed
 */
function square(
  x: number,
  y: number,
  nx: number,
  ny: number,
  innerWeight: number,
  outerWeight: number,
  clockwise: boolean, /* rotation for square (true at left end, false at right end) */
  vertices: Array<number>,
): number {
  const ix = x - (nx * innerWeight)
  const iy = y - (ny * innerWeight)
  const ox = x + (nx * outerWeight)
  const oy = y + (ny * outerWeight)

  /* Rotate nx,ny for extension vector */
  let exx
  let eyy

  if (clockwise) {
    exx = ny
    eyy = -nx
  } else {
    exx = -ny
    eyy = nx
  }

  /* [i|0]x,y extended at cap */
  const eix = ix + exx
  const eiy = iy + eyy
  const eox = ox + exx
  const eoy = oy + eyy

  /* Square itself must be inserted clockwise */
  vertices.push(
    eix, eiy,
    eox, eoy,
  )

  return 2
}

/**
 * Buffers vertices to draw an arc at the line joint or cap.
 *
 * @param {number} cx - X-coord of center
 * @param {number} cy - Y-coord of center
 * @param {number} sx - X-coord of arc start
 * @param {number} sy - Y-coord of arc start
 * @param {number} ex - X-coord of arc end
 * @param {number} ey - Y-coord of arc end
 * @param {Array<number>} vertices - buffer of vertices
 * @param {boolean} clockwise - orientation of vertices
 * @returns {number} - no. of vertices pushed
 */
function round(
  cx: number,
  cy: number,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  vertices: Array<number>,
  clockwise: boolean, /* if not cap, then clockwise is turn of joint, otherwise rotation from angle0 to angle1 */
): number {
  const cx2p0x = sx - cx
  const cy2p0y = sy - cy

  let angle0 = Math.atan2(cx2p0x, cy2p0y)
  let angle1 = Math.atan2(ex - cx, ey - cy)

  if (clockwise && angle0 < angle1) {
    angle0 += Math.PI * 2
  } else if (!clockwise && angle0 > angle1) {
    angle1 += Math.PI * 2
  }

  let startAngle = angle0
  const angleDiff = angle1 - angle0
  const absAngleDiff = Math.abs(angleDiff)

  const radius = Math.sqrt((cx2p0x * cx2p0x) + (cy2p0y * cy2p0y))
  const segCount = ((15 * absAngleDiff * Math.sqrt(radius) / Math.PI) >> 0) + 1
  const angleInc = angleDiff / segCount

  startAngle += angleInc

  if (clockwise) {
    vertices.push(
      cx, cy,
      sx, sy,
    )

    for (let i = 1, angle = startAngle; i < segCount; i++, angle += angleInc) {
      vertices.push(
        cx, cy,
        cx + ((Math.sin(angle) * radius)), cy + ((Math.cos(angle) * radius)),
      )
    }

    vertices.push(
      cx, cy,
      ex, ey,
    )
  } else {
    vertices.push(
      sx, sy,
      cx, cy,
    )

    for (let i = 1, angle = startAngle; i < segCount; i++, angle += angleInc) {
      vertices.push(
        cx + ((Math.sin(angle) * radius)), cy + ((Math.cos(angle) * radius)),
        cx, cy,
      )
    }

    vertices.push(
      ex, ey,
      cx, cy,
    )
  }

  return segCount * 2
}

import { Arc, Ellipse, Line, Polygon, Rect, RoundRect, Star } from '@rubickjs/math'
import type { Batchable2D } from '@rubickjs/renderer'
import type { Texture } from '@rubickjs/core'
import type { LineCap, LineJoin, LineStyle, Shape, Transform2D } from '@rubickjs/math'

export interface CanvasBatchable2D extends Batchable2D {
  type: 'stroke' | 'fill'
  texture?: Texture
}

export interface StrokedGraphics {
  shapes: Array<Shape>
  texture?: Texture
  textureTransform?: Transform2D
  style: Partial<LineStyle>
}

export interface FilledGraphics {
  shapes: Array<Shape>
  texture?: Texture
  textureTransform?: Transform2D
}

export class CanvasRenderingContext2D {
  texture?: Texture
  textureTransform?: Transform2D
  lineCap?: LineCap
  lineJoin?: LineJoin
  lineWidth?: number
  miterLimit?: number

  protected _currentPath = new Polygon()
  protected _currentShapes: Array<Shape> = []
  protected _stroked: Array<StrokedGraphics> = []
  protected _filled: Array<FilledGraphics> = []

  beginPath(): void {
    this._currentPath.reset()
  }

  moveTo(x: number, y: number): void {
    if (this._currentPath.points.length > 2) {
      this._currentShapes.push(this._currentPath.clone())
    }
    this._currentPath.points = [x, y]
  }

  lineTo(x: number, y: number): void {
    const points = this._currentPath.points
    const len = points.length
    if (points[len - 2] !== x || points[len - 1] !== y) {
      points.push(x, y)
    }
  }

  closePath(): void {
    const path = this._currentPath.clone()
    path.closed = true
    this._currentShapes.push(path)
  }

  rect(x: number, y: number, width: number, height: number): void {
    this._currentShapes.push(new Rect(x, y, width, height))
  }

  roundRect(x: number, y: number, width: number, height: number, radii: number): void {
    this._currentShapes.push(new RoundRect(x, y, width, height, radii))
  }

  ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise = false): void {
    this._currentShapes.push(new Ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise))
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise = false): void {
    this._currentShapes.push(new Arc(x, y, radius, radius, startAngle, endAngle, counterclockwise))
  }

  polygon(...path: Array<number>): void
  polygon(path: Array<number> | Polygon): void
  polygon(...path: any[]): void {
    let points: Array<number>
    let closed = true
    const poly = path[0] as Polygon
    if (poly.points) {
      closed = poly.closed
      points = poly.points
    } else if (Array.isArray(path[0])) {
      points = path[0]
    } else {
      points = path
    }
    const shape = new Polygon(points)
    shape.closed = closed
    this._currentShapes.push(shape)
  }

  star(
    x: number,
    y: number,
    points: number,
    radius: number,
    innerRadius?: number,
    rotation = 0,
  ): void {
    this._currentShapes.push(new Star(x, y, points, radius, innerRadius, rotation))
  }

  stroke(): void {
    this._stroked.push({
      shapes: this._currentShapes.slice(),
      texture: this.texture,
      textureTransform: this.textureTransform,
      style: {
        cap: this.lineCap ?? 'butt',
        join: this.lineJoin ?? 'miter',
        width: this.lineWidth ?? 1,
        miterLimit: this.miterLimit ?? 10,
      },
    })
    this._currentShapes.length = 0
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.rect(x, y, width, height)
    this.fill()
  }

  fill(): void {
    this._filled.push({
      shapes: this._currentShapes.slice(),
      texture: this.texture,
      textureTransform: this.textureTransform,
    })
    this._currentShapes.length = 0
  }

  reset(): void {
    this.texture = undefined
    this.textureTransform = undefined
    this.lineCap = undefined
    this.lineJoin = undefined
    this.lineWidth = undefined
    this.miterLimit = undefined
    this._currentPath.reset()
    this._currentShapes.length = 0
    this._stroked.length = 0
    this._filled.length = 0
  }

  buildUvs(
    start: number,
    vertices: Array<number>,
    uvs: Array<number>,
    texture?: Texture,
    textureTransform?: Transform2D,
  ): void {
    if (texture) {
      let w = texture.width
      let h = texture.height
      if (textureTransform) {
        [w, h] = textureTransform.applyToPoint(w, h)
      }
      for (let len = vertices.length, i = start; i < len; i += 2) {
        uvs.push(vertices[i] / w, vertices[i + 1] / h)
      }
    } else {
      for (let len = vertices.length, i = start; i < len; i += 2) {
        uvs.push(0, 0)
      }
    }
  }

  toBatchables(): Array<CanvasBatchable2D> {
    const batchables: Array<CanvasBatchable2D> = []
    let vertices: Array<number> = []
    let indices: Array<number> = []
    let uvs: Array<number> = []
    let startUv = 0
    let texture: Texture | undefined

    const push = (type: CanvasBatchable2D['type']) => {
      batchables.push({
        type,
        vertices,
        indices,
        uvs,
        texture,
      })
      vertices = []
      indices = []
      uvs = []
      texture = undefined
    }

    for (let len = this._stroked.length, i = 0; i < len; i++) {
      const graphics = this._stroked[i]
      texture ??= graphics.texture
      if (texture !== graphics.texture) {
        push('stroke')
      }
      const points: Array<number> = []
      for (let len = graphics.shapes.length, i = 0; i < len; i++) {
        graphics.shapes[i].buildContour(points)
      }
      startUv = vertices.length
      Line.buildGeometry(points, vertices, indices, graphics.style)
      this.buildUvs(startUv, vertices, uvs, graphics.texture, graphics.textureTransform)
    }

    if (vertices.length) {
      push('stroke')
    }

    for (let len = this._filled.length, i = 0; i < len; i++) {
      const graphics = this._filled[i]
      texture ??= graphics.texture
      if (texture !== graphics.texture) {
        push('fill')
      }
      startUv = vertices.length
      for (let len = graphics.shapes.length, i = 0; i < len; i++) {
        graphics.shapes[i].buildGeometry(vertices, indices)
      }
      this.buildUvs(startUv, vertices, uvs, graphics.texture, graphics.textureTransform)
    }

    if (vertices.length) {
      push('fill')
    }

    return batchables
  }
}

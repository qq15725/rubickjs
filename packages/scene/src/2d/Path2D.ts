import { Circle, Ellipse, Polygon, Rectangle, buildFillLine, buildFillShape } from '@rubickjs/math'
import { Texture, UvGeometry, UvMaterial } from '../resources'
import { Viewport } from '../main'
import { Node2D } from './Node2D'
import type { Shape } from '@rubickjs/math'

export class Path2D extends Node2D {
  geometry = new UvGeometry()
  material = new UvMaterial()
  points: number[] = []
  shapes: { cached?: any; value: Shape }[] = []
  vertices?: Float32Array
  uvs?: Float32Array
  indices?: Uint16Array
  texture: Texture | Viewport = Texture.WHITE

  moveTo(x: number, y: number): this {
    const len = this.points.length
    if (len > 2) {
      this.drawShape(new Polygon(this.points, false))
      this.points = [this.points[len - 2], this.points[len - 1]]
    }
    this.points[0] = x
    this.points[1] = y
    return this
  }

  lineTo(x: number, y: number): this {
    const len = this.points.length
    const fromX = this.points[len - 2]
    const fromY = this.points[len - 1]
    if (fromX !== x || fromY !== y) {
      this.points.push(x, y)
    }
    return this
  }

  drawRect(x: number, y: number, width: number, height: number): this {
    return this.drawShape(new Rectangle(x, y, width, height))
  }

  drawCircle(x: number, y: number, radius: number): this {
    return this.drawShape(new Circle(x, y, radius))
  }

  drawEllipse(x: number, y: number, width: number, height: number): this {
    return this.drawShape(new Ellipse(x, y, width, height))
  }

  drawPolygon(...path: Array<number>): this
  drawPolygon(path: Array<number> | Polygon): this
  drawPolygon(...path: any[]): this {
    let points: Array<number>
    let closeStroke = true
    const poly = path[0] as Polygon
    if (poly.points) {
      closeStroke = poly.closeStroke
      points = poly.points
    } else if (Array.isArray(path[0])) {
      points = path[0]
    } else {
      points = path
    }
    this.drawShape(new Polygon(points, closeStroke))
    return this
  }

  drawShape(shape: Shape) {
    this.shapes.push({ value: shape })
    return this
  }

  update() {
    const { vertices, indices } = buildFillLine(
      this.points, {
        alignment: 0.5,
        width: 10,
        cap: 'round',
        join: 'round',
        miterLimit: 10,
      },
      false,
    )

    if (!vertices.length) return

    for (let len = this.shapes.length, i = 0; i < len; i++) {
      const shape = this.shapes[i]
      if (!shape.cached) {
        shape.cached = buildFillShape(shape.value, true)
      }
      const start = vertices.length / 2
      for (let len = shape.cached.indices.length, i = 0; i < len; i++) {
        indices.push(start + shape.cached.indices[i])
      }
      for (let len = shape.cached.vertices.length, i = 0; i < len; i++) {
        vertices.push(shape.cached.vertices[i])
      }
    }

    const uvs: number[] = []
    for (let len = vertices.length / 2, i = 0; i < len; i++) {
      uvs.push(
        vertices[i * 2] / this.texture.size.x,
        1 - vertices[i * 2 + 1] / this.texture.size.y,
      )
    }

    this.vertices = new Float32Array(vertices)
    this.uvs = new Float32Array(uvs)
    this.indices = new Uint16Array(indices)
    this.dirty.add('buffers')
  }

  render() {
    if (!this.vertices || !this.uvs || !this.indices) {
      return
    }

    if (this.dirty.size > 0) {
      this.dirty.clear()

      this.geometry.update(
        this.vertices,
        this.uvs,
        this.indices,
      )
    }

    if (this.texture instanceof Viewport) {
      this.texture.texture.activate()
    } else {
      this.texture.activate()
    }

    this.geometry.draw(this.material, {
      ...this.renderer.uniforms,
      // tint: this.tint.toArray(),
    })
  }
}

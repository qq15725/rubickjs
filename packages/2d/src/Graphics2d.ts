import { customNode } from '@rubickjs/core'
import { CanvasRenderingContext2D } from '@rubickjs/canvas'
import { PI_2 } from '@rubickjs/math'
import { Node2d } from './node2d'
import type { Polygon } from '@rubickjs/math'

@customNode('graphics2d')
export class Graphics2d extends Node2d {
  protected _context = new CanvasRenderingContext2D()

  drawRect(x: number, y: number, width: number, height: number): this {
    this._context.rect(x, y, width, height)
    this._context.fill()
    this._requestRedraw()
    return this
  }

  drawRoundRect(x: number, y: number, width: number, height: number, radius: number): this {
    this._context.roundRect(x, y, width, height, radius)
    this._context.fill()
    this._requestRedraw()
    return this
  }

  drawCircle(x: number, y: number, radius: number): this {
    this._context.arc(x, y, radius, 0, PI_2)
    this._context.fill()
    this._requestRedraw()
    return this
  }

  drawEllipse(x: number, y: number, width: number, height: number): this {
    this._context.ellipse(x, y, width, height, 0, 0, PI_2)
    this._context.fill()
    this._requestRedraw()
    return this
  }

  drawPolygon(...path: Array<number>): this
  drawPolygon(path: Array<number> | Polygon): this
  drawPolygon(...path: any[]): this {
    this._context.polygon(...path)
    this._context.fill()
    this._requestRedraw()
    return this
  }

  drawStar(
    x: number,
    y: number,
    points: number,
    radius: number,
    innerRadius?: number,
    rotation = 0,
  ): this {
    this._context.star(x, y, points, radius, innerRadius, rotation)
    this._context.fill()
    this._requestRedraw()
    return this
  }

  moveTo(x: number, y: number): this {
    this._context.moveTo(x, y)
    this._requestRedraw()
    return this
  }

  lineTo(x: number, y: number): this {
    this._context.lineTo(x, y)
    this._requestRedraw()
    return this
  }
}

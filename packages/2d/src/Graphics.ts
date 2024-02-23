import { customNode } from '@rubickjs/core'
import { PI_2 } from '@rubickjs/shared'
import { Node2D } from './Node2D'
import type { Polygon } from '@rubickjs/math'

@customNode({
  tag: 'graphics',
  renderable: true,
})
export class Graphics extends Node2D {
  protected _resetContext = false

  drawRect(x: number, y: number, width: number, height: number): this {
    this.context.rect(x, y, width, height)
    this.context.fill()
    this.requestRedraw()
    return this
  }

  drawRoundRect(x: number, y: number, width: number, height: number, radius: number): this {
    this.context.roundRect(x, y, width, height, radius)
    this.context.fill()
    this.requestRedraw()
    return this
  }

  drawCircle(x: number, y: number, radius: number): this {
    this.context.arc(x + radius, y + radius, radius, 0, PI_2)
    this.context.fill()
    this.requestRedraw()
    return this
  }

  drawEllipse(x: number, y: number, width: number, height: number): this {
    const rx = width / 2
    const ry = height / 2
    this.context.ellipse(x + rx, y + ry, rx, ry, 0, 0, PI_2)
    this.context.fill()
    this.requestRedraw()
    return this
  }

  drawPolygon(...path: Array<number>): this
  drawPolygon(path: Array<number> | Polygon): this
  drawPolygon(...path: any[]): this {
    this.context.polygon(...path)
    this.context.fill()
    this.requestRedraw()
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
    this.context.star(x + radius, y + radius, points, radius, innerRadius, rotation)
    this.context.fill()
    this.requestRedraw()
    return this
  }

  moveTo(x: number, y: number): this {
    this.context.moveTo(x, y)
    this.requestRedraw()
    return this
  }

  lineTo(x: number, y: number): this {
    this.context.lineTo(x, y)
    this.requestRedraw()
    return this
  }
}

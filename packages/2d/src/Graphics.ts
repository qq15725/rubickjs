import { customNode } from '@rubickjs/core'
import { PI_2 } from '@rubickjs/shared'
import { Node2D } from './Node2D'
import type { ColorValue } from '@rubickjs/color'
import type { Texture } from '@rubickjs/core'
import type { LineCap, LineJoin, Polygon } from '@rubickjs/math'

@customNode({
  tag: 'graphics',
  renderable: true,
})
export class Graphics extends Node2D {
  protected _resetContext = false

  @Graphics._proxy() declare lineCap?: LineCap
  @Graphics._proxy() declare lineJoin?: LineJoin
  @Graphics._proxy() declare fillStyle?: ColorValue | Texture
  @Graphics._proxy() declare strokeStyle?: ColorValue | Texture
  @Graphics._proxy() declare lineWidth?: number
  @Graphics._proxy() declare miterLimit?: number
  @Graphics._proxy({ method: true }) declare rect: (x: number, y: number, width: number, height: number) => this
  @Graphics._proxy({ method: true, redraw: true }) declare fillRect: (x: number, y: number, width: number, height: number) => this
  @Graphics._proxy({ method: true, redraw: true }) declare strokeRect: (x: number, y: number, width: number, height: number) => this
  @Graphics._proxy({ method: true }) declare roundRect: (x: number, y: number, width: number, height: number, radii: number) => this
  @Graphics._proxy({ method: true }) declare ellipse: (x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean) => this
  @Graphics._proxy({ method: true }) declare arc: (x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean) => this
  @Graphics._proxy({ method: true }) declare beginPath: () => this
  @Graphics._proxy({ method: true }) declare moveTo: (x: number, y: number) => this
  @Graphics._proxy({ method: true }) declare lineTo: (x: number, y: number) => this
  @Graphics._proxy({ method: true }) declare closePath: () => this
  @Graphics._proxy({ method: true, redraw: true }) declare fill: () => this
  @Graphics._proxy({ method: true, redraw: true }) declare stroke: () => this

  protected static _proxy(
    options?: {
      method?: boolean
      redraw?: boolean
    },
  ) {
    return function (target: Graphics, name: PropertyKey) {
      Object.defineProperty(target.constructor.prototype, name, {
        get() {
          if (options?.method) {
            return (...args: Array<any>) => {
              // eslint-disable-next-line no-useless-call
              this.context[name].call(this.context, ...args)
              options.redraw && this.requestRedraw()
              return target
            }
          }
          return this.context[name]
        },
        set(value) {
          this.context[name] = value
        },
        configurable: true,
        enumerable: true,
      })
    }
  }

  drawCircle(x: number, y: number, radius: number): this {
    this.arc(x + radius, y + radius, radius, 0, PI_2)
    this.fill()
    return this
  }

  drawEllipse(x: number, y: number, width: number, height: number): this {
    const rx = width / 2
    const ry = height / 2
    this.ellipse(x + rx, y + ry, rx, ry, 0, 0, PI_2)
    this.fill()
    return this
  }

  drawPolygon(...path: Array<number>): this
  drawPolygon(path: Array<number> | Polygon): this
  drawPolygon(...path: any[]): this {
    this.context.polygon(...path)
    this.fill()
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
    this.fill()
    return this
  }
}

import { DEG_TO_RAD, Transform2D } from '@rubickjs/math'
import { customNode, property } from '@rubickjs/core'
import { PI_2, parseCssFunctions } from '@rubickjs/shared'
import { CanvasItem } from './CanvasItem'
import type { CanvasBatchable2D } from '@rubickjs/canvas'
import type { CanvasItemProperties } from './CanvasItem'

export interface Node2DProperties extends CanvasItemProperties {
  x?: number
  y?: number
  left?: number
  top?: number
  width?: number
  height?: number
  flipH?: boolean
  flipV?: boolean
  scaleX?: number
  scaleY?: number
  skewX?: number
  skewY?: number
  rotate?: number
  transform?: string
  transformOrigin?: string
}

@customNode('node2D')
export class Node2D extends CanvasItem {
  @property({ default: 0 }) x!: number
  @property({ default: 0 }) y!: number
  @property({ alias: 'x' }) left!: number
  @property({ alias: 'y' }) top!: number
  @property({ default: 0 }) width!: number
  @property({ default: 0 }) height!: number
  @property({ default: false }) flipH!: boolean
  @property({ default: false }) flipV!: boolean
  @property({ default: 1 }) scaleX!: number
  @property({ default: 1 }) scaleY!: number
  @property({ default: 0 }) skewX!: number
  @property({ default: 0 }) skewY!: number
  @property({ default: 0 }) rotate!: number
  @property() transform?: string
  @property() transformOrigin?: string

  protected _transform2d = new Transform2D(false)
  protected _transform3d = new Transform2D(false)
  protected _transformOrigin = [0.5, 0.5]
  protected _transformParentDirtyId?: number
  readonly _transform = new Transform2D()

  constructor(properties?: Node2DProperties) {
    super()
    properties && this.setProperties(properties)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'width':
      case 'height':
        this.requestRedraw()
        if (this.mask instanceof Node2D) {
          this.mask.width = this.width
          this.mask.height = this.height
        }
        break
      case 'x':
      case 'y':
      case 'flipH':
      case 'scaleX':
      case 'flipV':
      case 'scaleY':
      case 'skewX':
      case 'skewY':
      case 'rotate':
      case 'transform':
        this._updateTransform()
        break
      case 'transformOrigin':
        this._computeTransformOrigin()
        break
    }
  }

  protected _computeTransformOrigin(): void {
    const value = this.transformOrigin?.split(' ')
      .map(val => {
        val = val.trim()
        switch (val) {
          case 'left':
          case 'top':
            return 0
          case 'center':
            return 0.5
          case 'right':
          case 'bottom':
            return 1
          default:
            return Number(val)
        }
      })

    if (!value) return

    if (value.length === 1) value[1] = value[0]

    this._transformOrigin = value
    this.requestReflow()
  }

  protected _updateTransform2d(): void {
    this._transform2d
      .translate(this.x, this.y)
      .scale(
        (this.flipH ? -1 : 1) * this.scaleX,
        (this.flipV ? -1 : 1) * this.scaleY,
      )
      .skew(this.skewX, this.skewY)
      .rotate(this.rotate * DEG_TO_RAD)
      .update()
  }

  protected _updateTransform3d(): void {
    this._transform3d.identity()
    const transform = new Transform2D()
    parseCssFunctions(this.transform ?? '', {
      width: this.width,
      height: this.height,
    }).forEach(({ name, args }) => {
      const values = args.map(arg => arg.normalizedIntValue)
      transform.identity()
      switch (name) {
        case 'translate':
          transform.translate(
            (values[0]) * this.width,
            (values[1] ?? values[0]) * this.height,
          )
          break
        case 'translateX':
          transform.translateX(values[0] * this.width)
          break
        case 'translateY':
          transform.translateY(values[0] * this.height)
          break
        case 'translateZ':
          transform.translateZ(values[0])
          break
        case 'translate3d':
          transform.translate3d(
            values[0] * this.width,
            (values[1] ?? values[0]) * this.height,
            values[2] ?? values[1] ?? values[0],
          )
          break
        case 'scale':
          transform.scale(
            values[0],
            values[1] ?? values[0],
          )
          break
        case 'scaleX':
          transform.scaleX(values[0])
          break
        case 'scaleY':
          transform.scaleY(values[0])
          break
        case 'scale3d':
          transform.scale3d(
            values[0],
            values[1] ?? values[0],
            values[2] ?? values[1] ?? values[0],
          )
          break
        case 'rotate':
          transform.rotate(values[0] * PI_2)
          break
        case 'rotateX':
          transform.rotateX(values[0] * PI_2)
          break
        case 'rotateY':
          transform.rotateY(values[0] * PI_2)
          break
        case 'rotateZ':
          transform.rotateZ(values[0] * PI_2)
          break
        case 'rotate3d':
          transform.rotate3d(
            values[0] * PI_2,
            (values[1] ?? values[0]) * PI_2,
            (values[2] ?? values[1] ?? values[0]) * PI_2,
            (values[3] ?? values[2] ?? values[1] ?? values[0]) * PI_2,
          )
          break
        case 'skew':
          transform.skew(
            values[0],
            values[0] ?? values[1],
          )
          break
        case 'skewX':
          transform.skewX(values[0])
          break
        case 'skewY':
          transform.skewY(values[0])
          break
        case 'matrix':
          transform.set(values)
          break
      }
      this._transform3d.multiply(transform)
    })
    this._transform3d.update()
  }

  protected _updateTransform(): void {
    this._updateTransform2d()
    this._updateTransform3d()
    const t2d = this._transform2d.toArray()
    const t3d = this._transform3d.toArray()
    const t3dT2d = [
      (t3d[0] * t2d[0]) + (t3d[3] * t2d[1]),
      (t3d[1] * t2d[0]) + (t3d[4] * t2d[1]),
      (t3d[2] * t2d[0]) + (t3d[5] * t2d[1]) + t2d[2],
      (t3d[0] * t2d[3]) + (t3d[3] * t2d[4]),
      (t3d[1] * t2d[3]) + (t3d[4] * t2d[4]),
      (t3d[2] * t2d[3]) + (t3d[5] * t2d[4]) + t2d[5],
      0, 0, 1,
    ]
    const [originX, originY] = this._transformOrigin
    const offsetX = originX * this.width
    const offsetY = originY * this.height
    t3dT2d[2] += (t3dT2d[0] * -offsetX) + (t3dT2d[1] * -offsetY) + offsetX
    t3dT2d[5] += (t3dT2d[3] * -offsetX) + (t3dT2d[4] * -offsetY) + offsetY
    let transform
    const parentTransform = (this.getParent() as Node2D)?._transform as Transform2D | undefined
    if (parentTransform) {
      const pt = parentTransform.toArray()
      transform = [
        (t3dT2d[0] * pt[0]) + (t3dT2d[3] * pt[1]),
        (t3dT2d[1] * pt[0]) + (t3dT2d[4] * pt[1]),
        (t3dT2d[2] * pt[0]) + (t3dT2d[5] * pt[1]) + pt[2],
        (t3dT2d[0] * pt[3]) + (t3dT2d[3] * pt[4]),
        (t3dT2d[1] * pt[3]) + (t3dT2d[4] * pt[4]),
        (t3dT2d[2] * pt[3]) + (t3dT2d[5] * pt[4]) + pt[5],
        0, 0, 1,
      ]
      this._transformParentDirtyId = parentTransform.dirtyId
    } else {
      transform = t3dT2d
    }
    this._transform.set(transform)
    this.requestReflow()
  }

  protected _transformVertices(vertices: Array<number>): Array<number> {
    const [a, c, tx, b, d, ty] = this._transform.toArray()
    const newVertices = vertices.slice()
    for (let len = vertices.length, i = 0; i < len; i += 2) {
      const x = vertices[i]
      const y = vertices[i + 1]
      newVertices[i] = (a * x) + (c * y) + tx
      newVertices[i + 1] = (b * x) + (d * y) + ty
    }
    return newVertices
  }

  protected override _process(delta: number) {
    if (this.isRenderable()) {
      const ptDirtyId = (this.getParent() as Node2D)?._transform?.dirtyId
      if (ptDirtyId !== undefined && ptDirtyId !== this._transformParentDirtyId) {
        this._transformParentDirtyId = ptDirtyId
        this._updateTransform()
      }
    }
    super._process(delta)
  }

  override input(event: UIEvent) {
    super.input(event)

    if (!event.target && this.isRenderable()) {
      const { screenX, screenY } = event as PointerEvent
      if (screenX && screenY) {
        const { width, height } = this
        const [x, y] = this._transform.inverse().applyToPoint(screenX, screenY)
        if (x >= 0 && x < width && y >= 0 && y < height) {
          (event as any).target = this
        }
      }
    }
  }

  protected override _reflow(batchables: Array<CanvasBatchable2D>): Array<CanvasBatchable2D> {
    return this._repaint(
      batchables.map(batchable => {
        return {
          ...batchable,
          vertices: this._transformVertices(batchable.vertices),
        }
      }),
    )
  }
}

import { DEG_TO_RAD, Transform2D } from '@rubickjs/math'
import { customNode, property } from '@rubickjs/core'
import { PI_2, parseCssFunctions } from '@rubickjs/shared'
import { PointerInputEvent } from '@rubickjs/input'
import { CanvasItem } from '../canvas-item'
import type { CanvasBatchable2D } from '@rubickjs/canvas'
import type { CanvasItemProperties } from '../canvas-item'
import type { UIInputEvent } from '@rubickjs/input'
import type { PropertyValues } from '@rubickjs/core'

export interface Node2dProperties extends CanvasItemProperties {
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

@customNode('node2d')
export class Node2d extends CanvasItem {
  @property() x = 0
  @property() y = 0
  @property({ proxiedKey: 'x' }) left!: number
  @property({ proxiedKey: 'y' }) top!: number
  @property() width = 0
  @property() height = 0
  @property() flipH = false
  @property() flipV = false
  @property() scaleX = 1
  @property() scaleY = 1
  @property() skewX = 0
  @property() skewY = 0
  @property() rotate = 0
  @property() transform?: string
  @property() transformOrigin?: string

  protected _transform2d = new Transform2D(false)
  protected _transform3d = new Transform2D(false)
  protected _transformOrigin = [0.5, 0.5]
  protected _transformParentDirtyId?: number
  readonly _transform = new Transform2D()

  constructor(properties: Node2dProperties = {}) {
    super()
    this.setProperties(properties)
  }

  protected override _onUpdate(changed: PropertyValues) {
    super._onUpdate(changed)

    if (
      [
        'x', 'y', 'flipH', 'scaleX', 'flipV',
        'scaleY', 'skewX', 'skewY', 'rotate',
        'transform',
      ].some(key => changed.has(key))
    ) {
      this._computeTransform()
    }

    if (changed.has('transformOrigin')) {
      this._computeTransformOrigin()
    }
  }

  protected _computeTransformOrigin(): void {
    const value = this.transformOrigin?.split(',')
      .map(val => val.trim())
      .filter(Boolean)
      .map(val => Number(val))

    if (!value) return

    if (value.length === 1) value[1] = value[0]

    this._transformOrigin = value
    this._requestReflow()
  }

  protected _computeTransform3d(): void {
    this._transform3d.identity()
    const transform = new Transform2D()
    parseCssFunctions(this.transform ?? '').forEach(({ name, args }) => {
      const values = args.map(arg => arg.normalized)
      transform.identity()
      switch (name) {
        case 'translate':
          transform.translate(values[0], values[1] ?? values[0])
          break
        case 'translateX':
          transform.translateX(values[0])
          break
        case 'translateY':
          transform.translateY(values[0])
          break
        case 'scale':
          transform.scale(values[0] ?? 1, values[1] ?? values[0] ?? 1)
          break
        case 'scaleX':
          transform.scaleX(values[0])
          break
        case 'scaleY':
          transform.scaleY(values[0])
          break
        case 'rotate':
          transform.rotate(values[0] * PI_2)
          break
        case 'skew':
          transform.skew(values[0], values[1])
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
        case 'rotateX':
        case 'rotateY':
        case 'rotate3d':
        case 'rotateZ':
        case 'translate3d':
        case 'translateZ':
        case 'scale3d':
          // TODO
          break
      }
      this._transform3d.multiply(transform)
    })
    this._transform3d.update()
  }

  protected _computeTransform2d(): void {
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

  protected _computeTransform(): void {
    this._computeTransform2d()
    this._computeTransform3d()

    const lt = this._transform2d.toArray()
    const lt2 = this._transform3d.toArray()

    const parentTransform = (this.getParent() as Node2d)?._transform as Transform2D | undefined

    if (parentTransform) {
      const pt = parentTransform.toArray()
      this._transform.set([
        (lt[0] * pt[0]) + (lt[3] * pt[1]),
        (lt[1] * pt[0]) + (lt[4] * pt[1]),
        (lt[2] * pt[0]) + (lt[5] * pt[1]) + pt[2],
        (lt[0] * pt[3]) + (lt[3] * pt[4]),
        (lt[1] * pt[3]) + (lt[4] * pt[4]),
        (lt[2] * pt[3]) + (lt[5] * pt[4]) + pt[5],
        0, 0, 1,
      ])
      this._transformParentDirtyId = parentTransform.dirtyId
    } else {
      this._transform.set(lt)
    }
    this._transform.multiply(lt2)
    this._requestReflow()
  }

  protected _transformVertices(vertices: Array<number>): Array<number> {
    const [a, c, tx, b, d, ty] = this._transform.toArray()
    const [originX, originY] = this._transformOrigin
    const ox = this.width * originX
    const oy = this.height * originY
    for (let len = vertices.length, i = 0; i < len; i += 2) {
      const x = vertices[i] - ox
      const y = vertices[i + 1] - oy
      vertices[i] = (a * x) + (c * y) + tx + ox
      vertices[i + 1] = (b * x) + (d * y) + ty + oy
    }
    return vertices
  }

  protected override _process(delta: number) {
    const ptDirtyId = (this.getParent() as Node2d)?._transform?.dirtyId
    if (ptDirtyId !== undefined && ptDirtyId !== this._transformParentDirtyId) {
      this._transformParentDirtyId = ptDirtyId
      this._computeTransform()
    }
    if (this.mask instanceof Node2d) {
      this.mask.x = this.x + this.width / 2
      this.mask.y = this.y + this.height / 2
    }
    super._process(delta)
  }

  override input(event: UIInputEvent) {
    super.input(event)

    if (!event.target && this.isRenderable()) {
      if (event instanceof PointerInputEvent) {
        const { screenX, screenY } = event
        // const [originX, originY] = this._transformOrigin
        // screenX -= (originX * this.width)
        // screenY -= (originY * this.height)
        const [x, y] = this._transform.inverse().applyToPoint(screenX, screenY)
        // x += (originX * width)
        // y += (originY * height)
        const { width = 0, height = 0 } = this
        if (x >= 0 && x < width && y >= 0 && y < height) {
          event.target = this
        }
      }
    }
  }

  protected override _reflow(batchables: Array<CanvasBatchable2D>): Array<CanvasBatchable2D> {
    return this._repaint(
      batchables.map(batchable => {
        return {
          ...batchable,
          vertices: this._transformVertices(batchable.vertices.slice()),
        }
      }),
    )
  }
}

import { DEG_TO_RAD, Transform2D } from '@rubickjs/math'
import { customNode, property } from '@rubickjs/core'
import { PI_2, parseCssFunctions } from '@rubickjs/shared'
import { PointerInputEvent } from '@rubickjs/input'
import { CanvasItem } from '../canvas-item'
import type { UIInputEvent } from '@rubickjs/input'
import type { CanvasBatchable2D } from '@rubickjs/canvas'
import type { CanvasItemOptions } from '../canvas-item'

export interface Node2dOptions extends CanvasItemOptions {
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

  protected _transformOrigin = [0.5, 0.5]
  protected _transform = new Transform2D(false)
  protected _transform2 = new Transform2D(false)
  protected _parentTransformDirtyId = -1

  /** @internal */
  readonly _computedTransform = new Transform2D()

  constructor(options: Node2dOptions = {}) {
    super()
    this.setProperties(options)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'x':
      case 'y':
      case 'flipH':
      case 'scaleX':
      case 'flipV':
      case 'scaleY':
      case 'skewX':
      case 'skewY':
      case 'rotate':
      case 'transformOrigin':
        this._requestReflow()
        break
      case 'transform': {
        this._transform2.identity()
        const transform = new Transform2D()
        parseCssFunctions(value ?? '').forEach(({ name, args }) => {
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
            case 'rotateX':
              transform.scaleY(rotate2Scale(values[0]))
              break
            case 'rotateY':
              transform.scaleX(rotate2Scale(values[0]))
              break
            case 'rotate3d': {
              const [rx, ry, rz] = decomposeRotate3d(values[0], values[1], values[2], values[3])
              rx && (transform.scaleY(rotate2Scale(rx)))
              ry && (transform.scaleX(rotate2Scale(ry)))
              rz && (transform.rotate(rz * PI_2))
              break
            }
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
            case 'rotateZ':
            case 'translate3d':
            case 'translateZ':
            case 'scale3d':
              // TODO
              break
          }
          this._transform2.multiply(transform)
        })
        this._requestReflow()
        // TODO GPU
        break
      }
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
  }

  protected _computeTransform(): void {
    this._transform
      .translate(this.x, this.y)
      .scale(
        (this.flipH ? -1 : 1) * this.scaleX,
        (this.flipV ? -1 : 1) * this.scaleY,
      )
      .skew(this.skewX, this.skewY)
      .rotate(this.rotate * DEG_TO_RAD)
      .update()
    this._transform2.update()

    const lt = this._transform.toArray()
    const lt2 = this._transform2.toArray()

    const parentTransform = (this.getParent() as Node2d)?._computedTransform as Transform2D | undefined
    const ptDirtyId = parentTransform?.dirtyId ?? this._parentTransformDirtyId

    if (parentTransform) {
      const pt = parentTransform.toArray()
      this._computedTransform.set([
        (lt[0] * pt[0]) + (lt[3] * pt[1]),
        (lt[1] * pt[0]) + (lt[4] * pt[1]),
        (lt[2] * pt[0]) + (lt[5] * pt[1]) + pt[2],
        (lt[0] * pt[3]) + (lt[3] * pt[4]),
        (lt[1] * pt[3]) + (lt[4] * pt[4]),
        (lt[2] * pt[3]) + (lt[5] * pt[4]) + pt[5],
        0, 0, 1,
      ]).multiply(lt2)
    } else {
      this._computedTransform.set(lt).multiply(lt2)
    }
    this._parentTransformDirtyId = ptDirtyId
  }

  protected override _process(delta: number) {
    const ptDirtyId = (this.getParent() as Node2d)?._computedTransform?.dirtyId
    if (ptDirtyId !== undefined && ptDirtyId !== this._parentTransformDirtyId) {
      this._requestReflow()
    }
    if (this.mask instanceof Node2d) {
      this.mask.x = this.x + this.width / 2
      this.mask.y = this.y + this.height / 2
    }
    super._process(delta)
  }

  protected override _reflow(batchables: Array<CanvasBatchable2D>): Array<CanvasBatchable2D> {
    this._computeTransformOrigin()
    this._computeTransform()
    const [a, c, tx, b, d, ty] = this._computedTransform.toArray()
    const [originX, originY] = this._transformOrigin
    const ox = (this.width ?? 0) * originX
    const oy = (this.height ?? 0) * originY
    return super._reflow(
      batchables.map(batchable => {
        const vertices = batchable.vertices.slice()
        for (let len = vertices.length, i = 0; i < len; i += 2) {
          const x = vertices[i] - ox
          const y = vertices[i + 1] - oy
          vertices[i] = (a * x) + (c * y) + tx + ox
          vertices[i + 1] = (b * x) + (d * y) + ty + oy
        }
        return {
          ...batchable,
          vertices,
        }
      }),
    )
  }

  override input(event: UIInputEvent) {
    super.input(event)

    if (!event.target && this.isRenderable()) {
      if (event instanceof PointerInputEvent) {
        const { screenX, screenY } = event
        // const [originX, originY] = this._transformOrigin
        // screenX -= (originX * this.width)
        // screenY -= (originY * this.height)
        const [x, y] = this._computedTransform.inverse().applyToPoint(screenX, screenY)
        // x += (originX * width)
        // y += (originY * height)
        const { width = 0, height = 0 } = this
        if (x >= 0 && x < width && y >= 0 && y < height) {
          event.target = this
        }
      }
    }
  }
}

function rotate2Scale(deg: number) {
  return deg / 360 <= 0.5 ? deg / 360 * -4 + 1 : (deg / 360 - 1) * 4 + 1
}

function decomposeRotate3d(x: number, y: number, z: number, angle: number): [number, number, number] {
  if (x === 1 && y === 0 && z === 0) {
    return [angle, 0, 0]
  } else if (x === 0 && y === 1 && z === 0) {
    return [0, angle, 0]
  } else if (x === 0 && y === 0 && z === 1) {
    return [0, 0, angle]
  } else {
    const rad = angle * Math.PI / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    const m11 = cos + x * x * (1 - cos)
    const m12 = x * y * (1 - cos) - z * sin
    const m13 = x * z * (1 - cos) + y * sin
    const m22 = cos + y * y * (1 - cos)
    const m23 = y * z * (1 - cos) - x * sin
    const m33 = cos + z * z * (1 - cos)

    const rotateX = -Math.atan2(-m23, m22) * 180 / Math.PI
    const rotateY = -Math.atan2(m13, Math.sqrt(m23 * m23 + m33 * m33)) * 180 / Math.PI
    const rotateZ = -Math.atan2(-m12, m11) * 180 / Math.PI

    return [rotateX, rotateY, rotateZ]
  }
}

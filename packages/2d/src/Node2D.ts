import { Transform2D } from '@rubickjs/math'
import { customNode } from '@rubickjs/core'
import { CanvasItem } from './CanvasItem'
import type { CanvasBatchable2D } from '@rubickjs/canvas'
import type { CanvasItemOptions } from './CanvasItem'

export interface Node2DOptions extends CanvasItemOptions {
  //
}

@customNode('node2D')
export class Node2D extends CanvasItem {
  protected _transformParentDirtyId?: number
  readonly _transform = new Transform2D()

  constructor(options?: Node2DOptions) {
    super()
    options && this.setProperties(options)
  }

  protected override _onUpdateStyleProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateStyleProperty(key, value, oldValue)

    switch (key) {
      case 'width':
      case 'height':
        this.requestRedraw()
        if (this.mask instanceof Node2D) {
          this.mask.style.width = this.style.width
          this.mask.style.height = this.style.height
        }
        break
      case 'left':
      case 'top':
      case 'rotate':
      case 'transform':
        this._updateTransform()
        break
      case 'transformOrigin':
        this.requestReflow()
        break
    }
  }

  protected _updateTransform(): void {
    const t3dT2d = this.style.computedTransform.toArray()
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
    const ptDirtyId = (this.getParent() as Node2D)?._transform?.dirtyId
    if (ptDirtyId !== undefined && ptDirtyId !== this._transformParentDirtyId) {
      this._transformParentDirtyId = ptDirtyId
      this._updateTransform()
    }
    super._process(delta)
  }

  override input(event: UIEvent) {
    super.input(event)

    if (!event.target && this.isRenderable()) {
      const { screenX, screenY } = event as PointerEvent
      if (screenX && screenY) {
        const { width, height } = this.style
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

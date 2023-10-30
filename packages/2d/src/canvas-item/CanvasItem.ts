import { Node, customNode, property } from '@rubickjs/core'
import { Color, ColorMatrix } from '@rubickjs/color'
import { Canvas } from '@rubickjs/canvas'
import { clamp } from '@rubickjs/math'
import { PI_2, parseCssFunctions } from '@rubickjs/shared'
import type { WebGLBlendMode, WebGLRenderer } from '@rubickjs/renderer'
import type { CanvasBatchable2D } from '@rubickjs/canvas'
import type { NodeProperties, PropertyValues } from '@rubickjs/core'

export type CanvasItemBlendMode = WebGLBlendMode

export interface CanvasItemProperties extends NodeProperties {
  opacity?: number
  tint?: string
  filter?: string
  blendMode?: CanvasItemBlendMode
  backgroundColor?: string
}

@customNode('CanvasItem')
export class CanvasItem extends Node {
  @property() opacity = 1
  @property() backgroundColor = '#00000000'
  @property() tint = '#FFFFFF'
  @property() filter?: string
  @property() blendMode?: CanvasItemBlendMode

  /** @internal */
  _opacity = this.opacity
  /** @internal */
  _colorMatrix = new ColorMatrix()

  protected _parentOpacity?: number
  protected _tint = new Color(0xFFFFFF)
  protected _backgroundColor = new Color(0x00000000)

  // 2d batch render
  protected _context = Canvas.getContext('2d')
  protected _needsRedraw = false
  protected _needsReflow = false
  protected _needsRepaint = false
  protected _originalBatchables: Array<CanvasBatchable2D> = []
  protected _layoutedBatchables: Array<CanvasBatchable2D> = []
  protected _batchables: Array<CanvasBatchable2D> = []

  constructor(properties: CanvasItemProperties = {}) {
    super()
    this.setProperties(properties)
  }

  protected override _onUpdate(changed: PropertyValues) {
    super._onUpdate(changed)

    if (changed.has('blendMode')) {
      this._requestRepaint()
    }

    if (changed.has('backgroundColor')) {
      this._backgroundColor.value = this.backgroundColor
      this._requestRepaint()
    }

    if (changed.has('tint')) {
      this._tint.value = this.tint
      this._requestRepaint()
    }

    if (changed.has('opacity')) {
      this._computeOpacity()
      this._requestRepaint()
    }

    if (changed.has('filter')) {
      this._computeFilter()
      this._requestRepaint()
    }
  }

  protected _computeOpacity(): void {
    this._opacity = clamp(0, this.opacity, 1)
      * ((this._parent as CanvasItem)?._opacity ?? 1)
  }

  protected _computeFilter(): void {
    const funs = parseCssFunctions(this.filter ?? '')
    const matrix = this._colorMatrix.identity()
    funs.forEach(({ name, args }) => {
      const values = args.map(arg => arg.normalized)
      switch (name) {
        case 'hue-rotate':
        case 'hueRotate':
          matrix.hueRotate(values[0] * PI_2)
          break
        case 'saturate':
          matrix.saturate(values[0])
          break
        case 'brightness':
          matrix.brightness(values[0])
          break
        case 'contrast':
          matrix.contrast(values[0])
          break
        case 'invert':
          matrix.invert(values[0])
          break
        case 'sepia':
          matrix.sepia(values[0])
          break
        case 'opacity':
          matrix.opacity(values[0])
          break
        case 'grayscale':
          matrix.grayscale(values[0])
          break
      }
    })
  }

  protected _requestRedraw(): void { this._needsRedraw = true }
  protected _requestReflow(): void { this._needsReflow = true }
  protected _requestRepaint(): void { this._needsRepaint = true }

  protected override _process(delta: number): void {
    const parentOpacity = (this._parent as CanvasItem)?._opacity
    if (parentOpacity !== this._parentOpacity) {
      this._parentOpacity = parentOpacity
      this._computeOpacity()
    }

    super._process(delta)

    let batchables: Array<CanvasBatchable2D> | undefined
    if (this._needsRedraw || !this._originalBatchables) {
      this._draw()
      batchables = this._layoutedBatchables = this._relayout(
        this._originalBatchables = this._context.toBatchables(),
      )
      this._context.reset()
    } else if (this._needsReflow && this._originalBatchables) {
      batchables = this._layoutedBatchables = this._reflow(
        this._originalBatchables,
      )
    } else if (this._needsRepaint && this._layoutedBatchables) {
      batchables = this._repaint(
        this._layoutedBatchables,
      )
    }

    if (batchables) {
      this._batchables = batchables
      this._needsRedraw = false
      this._needsReflow = false
      this._needsRepaint = false
      this._onUpdateBatchables()
    }
  }

  protected _draw(): void { /** override */ }
  protected _relayout(batchables: Array<CanvasBatchable2D>): Array<CanvasBatchable2D> { return this._reflow(batchables) }
  protected _reflow(batchables: Array<CanvasBatchable2D>): Array<CanvasBatchable2D> { return this._repaint(batchables) }
  protected _repaint(batchables: Array<CanvasBatchable2D>): Array<CanvasBatchable2D> {
    return batchables.map(batchable => {
      return {
        ...batchable,
        backgroundColor: this._backgroundColor.abgr,
        tint: (this._opacity * 255 << 24) + this._tint.bgr,
        colorMatrix: this._colorMatrix.toMatrix4().toArray(true),
        colorMatrixOffset: this._colorMatrix.toVector4().toArray(),
        blendMode: this.blendMode,
      }
    })
  }

  protected _onUpdateBatchables(): void { /** override */ }

  protected override _render(renderer: WebGLRenderer): void {
    this._batchables.forEach(batchable => {
      batchable.texture?.upload(renderer)

      renderer.batch2D.render({
        ...batchable,
        texture: batchable.texture?._glTexture(renderer),
      })
    })
  }
}

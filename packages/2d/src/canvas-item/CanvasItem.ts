import { clamp } from '@rubickjs/math'
import { Color, ColorMatrix } from '@rubickjs/color'
import { Node, customNode, property } from '@rubickjs/core'
import { PI_2, parseCssFunctions } from '@rubickjs/shared'
import { Canvas } from '@rubickjs/canvas'
import type { WebGLBlendMode, WebGLRenderer } from '@rubickjs/renderer'
import type { CanvasBatchable2D } from '@rubickjs/canvas'
import type { NodeOptions } from '@rubickjs/core'

export type CanvasItemBlendMode = WebGLBlendMode

export interface CanvasItemOptions extends NodeOptions {
  opacity?: number
  backgroundColor?: string
  tint?: string
  filter?: string
  blendMode?: CanvasItemBlendMode
}

@customNode({
  tagName: 'canvasItem',
  renderable: true,
})
export class CanvasItem extends Node {
  @property() opacity = 1
  @property() backgroundColor = '#00000000'
  @property() tint = '#FFFFFF'
  @property() filter?: string
  @property() blendMode?: CanvasItemBlendMode

  /** @internal */
  _computedOpacity = this.opacity
  /** @internal */
  _colorMatrix = new ColorMatrix()

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

  constructor(options: CanvasItemOptions = {}) {
    super()
    this.setProperties(options)
  }

  override isVisible(): boolean {
    return super.isVisible()
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'opacity':
      case 'backgroundColor':
      case 'tint':
      case 'filter':
      case 'blendMode':
        this._requestRepaint()
        break
    }
  }

  protected _computeOpacity(): void {
    this._computedOpacity = clamp(0, this.opacity, 1)
      * ((this._parent as CanvasItem)?._computedOpacity ?? 1)
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

  protected _onUpdateBatchables(): void { /** override */ }
  protected _draw(): void { /** override */ }
  protected _relayout(batchables: Array<CanvasBatchable2D>): Array<CanvasBatchable2D> { return this._reflow(batchables) }
  protected _reflow(batchables: Array<CanvasBatchable2D>): Array<CanvasBatchable2D> { return this._repaint(batchables) }
  protected _repaint(batchables: Array<CanvasBatchable2D>): Array<CanvasBatchable2D> {
    this._backgroundColor.value = this.backgroundColor
    this._tint.value = this.tint
    this._computeOpacity()
    this._computeFilter()
    return batchables.map(batchable => {
      return {
        ...batchable,
        backgroundColor: this._backgroundColor.abgr,
        tint: (this._computedOpacity * 255 << 24) + this._tint.bgr,
        colorMatrix: this._colorMatrix.toMatrix4().toArray(true),
        colorMatrixOffset: this._colorMatrix.toVector4().toArray(),
        blendMode: this.blendMode,
      }
    })
  }

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

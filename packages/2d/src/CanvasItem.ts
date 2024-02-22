import { Node, customNode, property } from '@rubickjs/core'
import { Color } from '@rubickjs/color'
import { CanvasRenderingContext2D } from '@rubickjs/canvas'
import { clamp } from '@rubickjs/math'
import { Style2D } from './Style2D'
import type { Style2DOptions } from './Style2D'
import type { ColorValue } from '@rubickjs/color'
import type { WebGLBlendMode, WebGLRenderer } from '@rubickjs/renderer'
import type { CanvasBatchable2D } from '@rubickjs/canvas'
import type { NodeOptions } from '@rubickjs/core'

export interface CanvasItemOptions extends NodeOptions {
  style?: Style2DOptions
  tint?: string
  blendMode?: WebGLBlendMode
  draggable?: boolean
}

@customNode('canvasItem')
export class CanvasItem extends Node {
  protected declare _style: Style2D
  get style() { return this._style }
  set style(style) {
    style.on('updateProperty', this._onUpdateStyleProperty)
    this._style?.off('updateProperty', this._onUpdateStyleProperty)
    this._style = style
  }

  /** @internal */
  opacity = 1

  @property() tint?: ColorValue
  @property() blendMode?: WebGLBlendMode
  @property() draggable?: boolean

  protected _parentOpacity?: number
  protected _tint = new Color(0xFFFFFFFF)
  protected _backgroundColor = new Color(0x00000000)

  // 2d batch render
  protected _context = new CanvasRenderingContext2D()
  protected _waitingRedraw = false
  protected _waitingReflow = false
  protected _waitingRepaint = false
  protected _originalBatchables: Array<CanvasBatchable2D> = []
  protected _layoutedBatchables: Array<CanvasBatchable2D> = []
  protected _batchables: Array<CanvasBatchable2D> = []

  constructor(options?: CanvasItemOptions) {
    super()
    options && this.setProperties(options)
    this._onUpdateStyleProperty = this._onUpdateStyleProperty.bind(this)
    this.style = new Style2D()
  }

  override setProperties(properties: Record<PropertyKey, any>): this {
    const { style, ...restProperties } = properties
    super.setProperties(restProperties)
    style && this.style.setProperties(style)
    return this
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'blendMode':
        this.requestRepaint()
        break
      case 'tint':
        this._tint.value = value || 0xFFFFFFFF
        this.requestRepaint()
        break
    }
  }

  protected _onUpdateStyleProperty(key: PropertyKey, value: any, _oldValue: any): void {
    switch (key) {
      case 'backgroundColor':
        this._backgroundColor.value = value || 0x00000000
        this.requestRepaint()
        break
      case 'opacity':
        this._updateOpacity()
        this.requestRepaint()
        break
      case 'filter':
        this.requestRepaint()
        break
    }
  }

  protected _updateOpacity(): void {
    this.opacity = clamp(0, this.style.opacity, 1)
      * ((this._parent as CanvasItem)?.opacity ?? 1)
  }

  requestRedraw(): void { this._waitingRedraw = true }
  requestReflow(): void { this._waitingReflow = true }
  requestRepaint(): void { this._waitingRepaint = true }

  protected override _process(delta: number): void {
    const parentOpacity = (this._parent as CanvasItem)?.opacity
    if (parentOpacity !== this._parentOpacity) {
      this._parentOpacity = parentOpacity
      this._updateOpacity()
    }

    super._process(delta)
  }

  protected _draw(): void { /** override */ }
  protected _relayout(batchables: Array<CanvasBatchable2D>): Array<CanvasBatchable2D> { return this._reflow(batchables) }
  protected _reflow(batchables: Array<CanvasBatchable2D>): Array<CanvasBatchable2D> { return this._repaint(batchables) }
  protected _repaint(batchables: Array<CanvasBatchable2D>): Array<CanvasBatchable2D> {
    const colorMatrix = this.style.computedFilter
    return batchables.map(batchable => {
      return {
        ...batchable,
        backgroundColor: this._backgroundColor.abgr,
        tint: this._tint.toArgb(this.opacity, true),
        colorMatrix: colorMatrix.toMatrix4().toArray(true),
        colorMatrixOffset: colorMatrix.toVector4().toArray(),
        blendMode: this.blendMode,
      }
    })
  }

  protected override _render(renderer: WebGLRenderer): void {
    let batchables: Array<CanvasBatchable2D> | undefined
    if (this._waitingRedraw || !this._originalBatchables) {
      this._draw()
      batchables = this._layoutedBatchables = this._relayout(
        this._originalBatchables = this._context.toBatchables(),
      )
      this._context.reset()
    } else if (this._waitingReflow && this._originalBatchables) {
      batchables = this._layoutedBatchables = this._reflow(
        this._originalBatchables,
      )
    } else if (this._waitingRepaint && this._layoutedBatchables) {
      batchables = this._repaint(
        this._layoutedBatchables,
      )
    }

    if (batchables) {
      this._batchables = batchables
      this._waitingRedraw = false
      this._waitingReflow = false
      this._waitingRepaint = false
    }

    this._batchables.forEach(batchable => {
      batchable.texture?.upload(renderer)

      renderer.batch2D.render({
        ...batchable,
        texture: batchable.texture?._glTexture(renderer),
      })
    })

    super._render(renderer)
  }
}

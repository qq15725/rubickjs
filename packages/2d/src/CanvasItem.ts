import { Node, customNode, property } from '@rubickjs/core'
import { Color } from '@rubickjs/color'
import { clamp } from '@rubickjs/math'
import { Style } from './Style'
import { CanvasContext } from './CanvasContext'
import type { CanvasBatchable } from './CanvasContext'
import type { StyleOptions } from './Style'
import type { ColorValue } from '@rubickjs/color'
import type { WebGLBlendMode, WebGLRenderer } from '@rubickjs/renderer'
import type { NodeOptions } from '@rubickjs/core'

export interface CanvasItemOptions extends NodeOptions {
  style?: StyleOptions
  tint?: string
  blendMode?: WebGLBlendMode
}

@customNode('canvasItem')
export class CanvasItem extends Node {
  @property() tint?: ColorValue
  @property() blendMode?: WebGLBlendMode

  protected declare _style: Style
  get style() { return this._style }
  set style(style) {
    style.on('updateProperty', this._onUpdateStyleProperty)
    this._style?.off('updateProperty', this._onUpdateStyleProperty)
    this._style = style
  }

  /** @internal */
  opacity = 1

  protected _parentOpacity?: number
  protected _tint = new Color(0xFFFFFFFF)
  protected _backgroundColor = new Color(0x00000000)

  // 2d batch render
  context = new CanvasContext()
  protected _resetContext = true
  protected _waitingRedraw = false
  protected _waitingReflow = false
  protected _waitingRepaint = false
  protected _originalBatchables: Array<CanvasBatchable> = []
  protected _layoutedBatchables: Array<CanvasBatchable> = []
  protected _batchables: Array<CanvasBatchable> = []

  constructor(options?: CanvasItemOptions) {
    super()
    options && this.setProperties(options)
    this._onUpdateStyleProperty = this._onUpdateStyleProperty.bind(this)
    this.style = new Style()
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
  protected _relayout(batchables: Array<CanvasBatchable>): Array<CanvasBatchable> { return this._reflow(batchables) }
  protected _reflow(batchables: Array<CanvasBatchable>): Array<CanvasBatchable> { return this._repaint(batchables) }
  protected _repaint(batchables: Array<CanvasBatchable>): Array<CanvasBatchable> {
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
    let batchables: Array<CanvasBatchable> | undefined
    if (this._waitingRedraw || !this._originalBatchables) {
      this._draw()
      batchables = this._layoutedBatchables = this._relayout(
        this._originalBatchables = this.context.toBatchables(),
      )
      if (this._resetContext) {
        this.context.reset()
      }
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

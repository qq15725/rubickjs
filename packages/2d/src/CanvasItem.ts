import { clamp } from '@rubickjs/math'
import { Color, ColorMatrix } from '@rubickjs/color'
import { Node } from '@rubickjs/core'
import { CanvasItemStyle } from './CanvasItemStyle'
import type { ColorValue } from '@rubickjs/color'

export class CanvasItem extends Node {
  /** Tint */
  protected _tint = new Color(0xFFFFFF)
  get tint(): ColorValue { return this._tint.source }
  set tint(val) { this._tint.source = val }

  /** Alpha */
  protected _alpha = 1
  get alpha(): number { return this._alpha }
  set alpha(val) { this._updateProp('_alpha', clamp(0, val, 1)) }
  protected _parentAlphaDirtyId?: number

  /** Global alpha */
  globalAlpha = this.alpha

  /** Background color */
  protected _backgroundColor = new Color(0x00000000)
  get backgroundColor(): ColorValue { return this._backgroundColor.source }
  set backgroundColor(val) { this._backgroundColor.source = val }

  /** Color matrix */
  readonly colorMatrix = new ColorMatrix()

  /** Style */
  protected _style = new CanvasItemStyle(this)
  get style() { return this._style }
  set style(val) { this._style.update(val) }

  override isVisible(): boolean {
    return this.globalAlpha > 0 && super.isVisible()
  }

  updateGlobalAlpha(): void {
    const p = this._parent
    if (!(p instanceof CanvasItem)) {
      return
    }
    const pa = p?.globalAlpha ?? 1
    const paDirtyId = p?.getDirtyId('alpha') ?? this._parentAlphaDirtyId
    if (this.hasDirty('alpha') || this._parentAlphaDirtyId !== paDirtyId) {
      this.deleteDirty('alpha')
      this._parentAlphaDirtyId = paDirtyId
      this.globalAlpha = this._alpha * pa
    }
  }

  protected override _process(delta: number): void {
    super._process(delta)
    this.updateGlobalAlpha()
  }
}

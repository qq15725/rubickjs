import { clamp } from '@rubickjs/math'
import { Color, ColorMatrix } from '@rubickjs/color'
import { Ref } from '@rubickjs/shared'
import { Node } from '@rubickjs/core'
import { CanvasItemStyle } from './styles'
import type { NodeProcessContext } from '@rubickjs/core'
import type { ColorValue } from '@rubickjs/color'

export class CanvasItem extends Node {
  /** Tint */
  protected _tint = new Color(0xFFFFFF)
  get tint(): ColorValue { return this._tint.value }
  set tint(val) { this._tint.value = val }

  /** Alpha */
  protected _alpha = new Ref(1)
  get alpha(): number { return this._alpha.value }
  set alpha(val) { this._alpha.value = clamp(0, val, 1) }
  get alphaDirtyId() { return this._alpha.dirtyId }
  protected _parentAlphaDirtyId = this.alphaDirtyId

  /** Global alpha */
  globalAlpha = this.alpha

  /** Background color */
  protected _backgroundColor = new Color(0x00000000)
  get backgroundColor(): ColorValue { return this._backgroundColor.value }
  set backgroundColor(val) { this._backgroundColor.value = val }

  /** Color matrix */
  readonly colorMatrix = new ColorMatrix()

  /** Style */
  protected _style = new CanvasItemStyle(this)
  get style() { return this._style }
  set style(val) { this._style.update(val) }

  constructor() {
    super()
    this._alpha.on('update', this._onUpdateAlpha.bind(this))
  }

  protected _onUpdateAlpha() {
    this.addDirty('alpha')
  }

  isVisible(): boolean {
    return this.globalAlpha > 0 && super.isVisible()
  }

  /**
   * Update alpha
   */
  updateAlpha(): void {
    const p = this.parentNode as CanvasItem
    const pa = p?.globalAlpha ?? 1
    const paDirtyId = p?.alphaDirtyId ?? this._parentAlphaDirtyId
    if (this.hasDirty('alpha') || this._parentAlphaDirtyId !== paDirtyId) {
      this.deleteDirty('alpha')
      this._parentAlphaDirtyId = paDirtyId
      this.globalAlpha = this._alpha.value * pa
    }
  }

  protected override _process(context: NodeProcessContext): void {
    super._process(context)
    this.updateAlpha()
  }
}

import { Transform2D, Vector2 } from '@rubickjs/math'
import { Node2DStyle } from './Node2DStyle'
import { CanvasItem } from './CanvasItem'

export class Node2D extends CanvasItem {
  protected _parentTransformDirtyId = -1

  /** Global transform */
  readonly globalTransform = new Transform2D()

  /** Transform */
  readonly transform = new Transform2D()
  readonly transform2 = new Transform2D()

  /** Transform origin */
  readonly transformOrigin = new Vector2(0.5, 0.5)

  /** Size */
  readonly size = new Vector2(0, 0)
  get width() { return this.size.x }
  set width(val) { this.size.x = val }
  get height() { return this.size.y }
  set height(val) { this.size.y = val }

  /** Position */
  get position(): Vector2 { return this.transform.position }
  set position(val: { x: number; y: number }) { this.transform.position.update(val.x, val.y) }
  get x(): number { return this.position.x }
  set x(val: number) { this.position.x = val }
  get y(): number { return this.position.y }
  set y(val: number) { this.position.y = val }

  /** Scale */
  get scale(): Vector2 { return this.transform.scale }
  set scale(val: { x: number; y: number }) { this.transform.scale.update(val.x, val.y) }

  /** Skew */
  get skew(): Vector2 { return this.transform.skew }
  set skew(val: { x: number; y: number }) { this.transform.skew.update(val.x, val.y) }

  /** Rotation */
  get rotation(): number { return this.transform.rotation }
  set rotation(val) { this.transform.rotation = val }

  /** Style */
  protected override _style = new Node2DStyle(this)

  constructor() {
    super()
    this.size.onUpdate(this._onUpdateSize.bind(this))
    this.transformOrigin.onUpdate(this._onUpdateTransformOrigin.bind(this))
  }

  protected _onUpdateSize(): void { /** override */ }
  protected _onUpdateTransform(): void { /** override */ }
  protected _onUpdateTransformOrigin(): void { /** override */ }

  updateTransform(): void {
    const lt = this.transform
    const lt2 = this.transform2
    const pt = (this.getParent() as Node2D)?.globalTransform as Transform2D | undefined
    const ptDirtyId = pt?.dirtyId ?? this._parentTransformDirtyId

    if (lt.update() || lt2.update() || this._parentTransformDirtyId !== ptDirtyId) {
      this._parentTransformDirtyId = ptDirtyId
      const gt = this.globalTransform.copy(lt)
      if (pt) {
        gt[0] = (lt[0] * pt[0]) + (lt[3] * pt[1])
        gt[3] = (lt[0] * pt[3]) + (lt[3] * pt[4])
        gt[1] = (lt[1] * pt[0]) + (lt[4] * pt[1])
        gt[4] = (lt[1] * pt[3]) + (lt[4] * pt[4])
        gt[2] = (lt[2] * pt[0]) + (lt[5] * pt[1]) + pt[2]
        gt[5] = (lt[2] * pt[3]) + (lt[5] * pt[4]) + pt[5]
        gt.multiply(lt2)
        gt.sync()
      }
      this._onUpdateTransform()
    }
  }

  protected override _process(delta: number) {
    super._process(delta)
    this.updateTransform()
  }
}

import { Transform2D, Vector2 } from '@rubickjs/math'
import { Node2DStyle } from '../resources'
import { CanvasItem } from '../main'

export class Node2D extends CanvasItem {
  /**
   * Global transform
   */
  readonly globalTransform = new Transform2D()

  /**
   * Transform relative to parent node
   */
  readonly transform = new Transform2D()

  /**
   * The transform origin is the point around which a transformation is applied
   *
   * (0 - 1), (0 - 1)
   */
  readonly transformOrigin = new Vector2(0.5, 0.5)

  /**
   * Size
   */
  readonly size = new Vector2(0, 0)
  get width() { return this.size.x }
  set width(val) { this.size.x = val }
  get height() { return this.size.y }
  set height(val) { this.size.y = val }

  /**
   * Position relative to parent node
   */
  get position(): Vector2 { return this.transform.position }
  set position(val: { x: number; y: number }) { this.transform.position.update(val.x, val.y) }
  get x(): number { return this.position.x }
  set x(val: number) { this.position.x = val }
  get y(): number { return this.position.y }
  set y(val: number) { this.position.y = val }

  /**
   * Scale, unscaled values of this node (1, 1)
   */
  get scale(): Vector2 { return this.transform.scale }
  set scale(val: { x: number; y: number }) { this.transform.scale.update(val.x, val.y) }

  /**
   * The skew factor for the object in radians.
   */
  get skew(): Vector2 { return this.transform.skew }
  set skew(val: { x: number; y: number }) { this.transform.skew.update(val.x, val.y) }

  /**
   * The rotation of the object in radians.
   * 'rotation' and 'angle' have the same effect on a display object; rotation is in radians, angle is in degrees.
   */
  get rotation(): number { return this.transform.rotation }
  set rotation(val) { this.transform.rotation = val }

  /**
   * Style
   */
  protected override _style = new Node2DStyle(this)

  constructor() {
    super()
    this.size.onUpdate(this._onUpdateSize.bind(this))
    this.transformOrigin.onUpdate(this._onUpdateTransformOrigin.bind(this))
  }

  protected _onUpdateSize() {
    this.addDirty('size')
  }

  protected _onUpdateTransformOrigin() {
    this.addDirty('transformOrigin')
  }

  /**
   * Update transform
   */
  updateTransform(): void {
    const lt = this.transform
    const pt = (this.parentNode as Node2D)?.globalTransform as Transform2D | undefined

    if (lt.update() || (pt && pt.dirty)) {
      const gt = this.globalTransform.copy(lt)
      if (pt) {
        gt[0] = (lt[0] * pt[0]) + (lt[3] * pt[1])
        gt[3] = (lt[0] * pt[3]) + (lt[3] * pt[4])
        gt[1] = (lt[1] * pt[0]) + (lt[4] * pt[1])
        gt[4] = (lt[1] * pt[3]) + (lt[4] * pt[4])
        gt[2] = (lt[2] * pt[0]) + (lt[5] * pt[1]) + pt[2]
        gt[5] = (lt[2] * pt[3]) + (lt[5] * pt[4]) + pt[5]
        gt.sync()
      }

      gt.dirty = true
      for (let len = this.childNodes.length, i = 0; i < len; i++) {
        const child = this.childNodes[i]
        if (child instanceof Node2D) {
          child.updateTransform()
        }
      }
      gt.dirty = false

      this._onUpdateTransform()
    }
  }

  /** Can override */
  protected _onUpdateTransform() {}

  protected override _process(delta: number) {
    super._process(delta)
    this.updateTransform()
  }
}

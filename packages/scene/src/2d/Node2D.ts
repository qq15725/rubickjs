import { Transform2D } from '@rubickjs/math'
import { CanvasItem } from '../main/CanvasItem'
import type { ObservablePoint } from '@rubickjs/math'

export class Node2D extends CanvasItem {
  /**
   * Transform relative to parent node
   */
  readonly transform = new Transform2D()

  /**
   * Global transform
   */
  readonly globalTransform = new Transform2D()

  /**
   * Position relative to parent node
   */
  get position(): ObservablePoint { return this.transform.position }
  set position(val: { x: number; y: number }) { this.transform.position.copy(val) }

  get x(): number { return this.position.x }
  set x(val: number) { this.position.x = val }

  get y(): number { return this.position.y }
  set y(val: number) { this.position.y = val }

  /**
   * Scale, unscaled values of this node (1, 1)
   */
  get scale(): ObservablePoint { return this.transform.scale }
  set scale(val: { x: number; y: number }) { this.transform.scale.copy(val) }

  /**
   * The skew factor for the object in radians.
   */
  get skew(): ObservablePoint { return this.transform.skew }
  set skew(val: { x: number; y: number }) { this.transform.skew.copy(val) }

  /**
   * The rotation of the object in radians.
   * 'rotation' and 'angle' have the same effect on a display object; rotation is in radians, angle is in degrees.
   */
  get rotation(): number { return this.transform.rotation }
  set rotation(val) { this.transform.rotation = val }

  /**
   * Update transform
   */
  updateTransform(): boolean {
    if (this.transform.update()) {
      this.globalTransform.copy(this.transform)

      if (this.owner && this.owner instanceof Node2D) {
        this.globalTransform.multiply(this.owner.transform)
      }

      return true
    }

    return false
  }

  process(delta: number) {
    if (this.updateTransform()) {
      this.dirty.add('transform')
    }

    super.process(delta)
  }
}

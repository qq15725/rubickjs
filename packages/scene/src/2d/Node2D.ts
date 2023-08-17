import { Transform2D } from '@rubickjs/math'
import { CanvasItem } from '../main/CanvasItem'

export class Node2D extends CanvasItem {
  /**
   * Global transform
   */
  readonly globalTransform = new Transform2D()

  /**
   * Update transform
   */
  protected _updateTransform(): boolean {
    const transform = this.transform

    if (transform.update()) {
      const globalTransform = this.globalTransform
      globalTransform.copy(transform)

      if (this.owner && this.owner instanceof Node2D) {
        const ownerPosition = this.owner.transform.position
        if (ownerPosition.x || ownerPosition.y) {
          globalTransform.position.update(
            globalTransform.position.x + ownerPosition.x,
            globalTransform.position.y + ownerPosition.y,
          )
          globalTransform.update()
        }
      }

      this._onUpdateTransform()

      return true
    }

    return false
  }

  /** Can override */
  protected _onUpdateTransform() {}

  process(delta: number) {
    this._updateTransform()
    super.process(delta)
  }
}

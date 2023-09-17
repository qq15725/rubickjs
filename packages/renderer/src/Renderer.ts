import { DEVICE_PIXEL_RATIO } from '@rubickjs/shared'

export abstract class Renderer {
  /**
   * Canvas
   */
  view?: HTMLCanvasElement

  /**
   * Device pixel ratio
   */
  pixelRatio = DEVICE_PIXEL_RATIO

  /**
   * Screen rect
   */
  readonly screen = { x: 0, y: 0, width: 0, height: 0 }

  /**
   * Related metadata
   */
  readonly related = new WeakMap<object, any>()

  getRelated<T>(source: object, create?: () => T): T {
    let related = this.related.get(source)

    if (related) return related

    if (!create) {
      console.warn('Failed to get related', source)
      return null as T
    }

    this.related.set(source, related = create())

    return related
  }

  resize(width: number, height: number, updateStyle = true) {
    const viewWidth = Math.round(width * this.pixelRatio)
    const viewHeight = Math.round(height * this.pixelRatio)
    const screenWidth = viewWidth / this.pixelRatio
    const screenHeight = viewHeight / this.pixelRatio
    if (this.view) {
      this.view.width = viewWidth
      this.view.height = viewHeight
    }
    this.screen.width = screenWidth
    this.screen.height = screenHeight
    if (updateStyle && this.view) {
      this.view.style.width = `${ screenWidth }px`
      this.view.style.height = `${ screenHeight }px`
    }
  }
}

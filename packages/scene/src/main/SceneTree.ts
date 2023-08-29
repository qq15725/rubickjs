import { QuadUvGeometry } from '../resources'
import { Viewport } from './Viewport'
import { MainLoop } from './MainLoop'
import { Timer } from './Timer'
import type { WebGLRenderer } from '@rubickjs/renderer'
import type { UIInputEvent } from '@rubickjs/input'

export class SceneTree extends MainLoop {
  /**
   * Global root node
   */
  readonly root = new Viewport(true).setTree(this)

  /**
   * Global timeline
   */
  readonly timeline = new Timer()

  /**
   * The currently active viewport
   */
  activeViewport?: Viewport

  /**
   * Handle input evnet
   *
   * @param event
   */
  input(event: UIInputEvent): void {
    this.root.input(event)
  }

  /**
   * Process root node status updates before rendering
   *
   * @param delta
   */
  process(delta: number): void {
    this.timeline.addTime(delta)
    this.root.process(delta)
  }

  /**
   * Render root node to screen
   */
  render(renderer: WebGLRenderer): void {
    this.root.render(renderer)
    this._renderToScreen(renderer)
  }

  /**
   * Render to screen
   * @param renderer
   * @protected
   */
  protected _renderToScreen(renderer: WebGLRenderer) {
    const [width, height] = this.root.projection.size
    renderer.updateViewport(
      0, 0,
      width * renderer.pixelRatio,
      height * renderer.pixelRatio,
    )
    renderer.clear()
    this.root.texture.activate(renderer, 0)
    QuadUvGeometry.draw(renderer)
  }
}

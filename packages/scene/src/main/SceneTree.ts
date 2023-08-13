import { QuadUvGeometry, Timeline } from '../resources'
import { Viewport } from './Viewport'
import { MainLoop } from './MainLoop'
import type { UIInputEvent } from '@rubickjs/input'

export class SceneTree extends MainLoop {
  /**
   * Global root node
   */
  readonly root = new Viewport(true).setTree(this)

  /**
   * Global timeline
   */
  readonly timeline: Timeline

  /**
   * The currently active viewport
   */
  viewport?: Viewport

  constructor(timeline = new Timeline()) {
    super()

    this.timeline = timeline
  }

  /**
   * Handle input evnet
   *
   * @param event
   */
  input(event: UIInputEvent): void {
    this.root.input(event)
  }

  /**
   * Process each frame
   *
   * @param delta
   */
  process(delta: number): void {
    this.timeline.addTime(delta)

    // draw scene tree to root viewport
    this.root.process(delta)

    // draw quad texture to screen
    const { x: width, y: height } = this.root.size
    const renderer = this.renderer
    renderer.updateViewport(0, 0, width * renderer.pixelRatio, height * renderer.pixelRatio)
    renderer.clear()
    this.root.texture.activate(0)
    QuadUvGeometry.draw()
  }
}

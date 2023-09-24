import { QuadUvGeometry } from './geometries'
import { Root } from './viewports'
import { MainLoop } from './MainLoop'
import { Timer } from './Timer'
import { RenderQueue } from './RenderQueue'
import { InternalMode } from './Node'
import type { Viewport } from './viewports'
import type { WebGLRenderer } from '@rubickjs/renderer'
import type { UIInputEvent } from '@rubickjs/input'

export class SceneTree extends MainLoop {
  readonly root = new Root(true)._setTree(this)
  readonly renderQueue = new RenderQueue()

  protected _currentViewport?: Viewport
  getCurrentViewport() { return this._currentViewport }
  setCurrentViewport(viewport: Viewport | undefined) { this._currentViewport = viewport }

  constructor(
    readonly timeline = new Timer(),
  ) {
    super()
    this.root.addChild(timeline, InternalMode.FRONT)
  }

  input(event: UIInputEvent): void {
    this.root.input(event)
  }

  render(renderer: WebGLRenderer): void {
    this.emit('processFrame')
    this.root.notification('process')
    renderer.uniforms.projectionMatrix = this.root.projection.toArray(true)
    this.renderQueue.handle(renderer)
    this._renderToScreen(renderer)
  }

  protected _renderToScreen(renderer: WebGLRenderer) {
    const pixelRatio = renderer.pixelRatio
    const [width, height] = this.root.projection.size
    renderer.activeFramebuffer(null)
    renderer.updateViewport(
      0, 0,
      width * pixelRatio,
      height * pixelRatio,
    )
    renderer.clear()
    this.root.texture.activate(renderer, 0)
    QuadUvGeometry.draw(renderer)
  }
}

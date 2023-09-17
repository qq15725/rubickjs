import { QuadUvGeometry } from './geometries'
import { Viewport } from './viewports'
import { MainLoop } from './MainLoop'
import { Timer } from './Timer'
import { RenderQueue } from './RenderQueue'
import type { WebGLRenderer } from '@rubickjs/renderer'
import type { UIInputEvent } from '@rubickjs/input'

export class SceneTree extends MainLoop {
  readonly root!: Viewport
  readonly renderQueue = new RenderQueue()

  protected _currentViewport?: Viewport
  getCurrentViewport() { return this._currentViewport }
  setCurrentViewport(viewport: Viewport | undefined) { this._currentViewport = viewport }

  constructor(
    public timeline = new Timer(),
  ) {
    super()
    const root = new Viewport(true)
    root.tree = this
    this.root = root
  }

  input(event: UIInputEvent): void {
    this.root.input(event)
  }

  render(renderer: WebGLRenderer, elapsedTime: number): void {
    const renderQueue = this.renderQueue
    this.emit('processStart')
    this.root.process({
      elapsedTime,
      currentTime: this.timeline.addTime(elapsedTime),
      renderQueue,
    })
    this.emit('processEnd')
    renderer.uniforms.projectionMatrix = this.root.projection.toArray(true)
    renderQueue.handle(renderer)
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

import { QuadUvGeometry } from './geometries'
import { Root } from './Root'
import { MainLoop } from './MainLoop'
import { Timer } from './Timer'
import { InternalMode } from './Node'
import { customNode } from './decorators'
import { RenderStack } from './RenderStack'
import type { Viewport } from './Viewport'
import type { WebGLRenderer } from '@rubickjs/renderer'

@customNode('sceneTree')
export class SceneTree extends MainLoop {
  readonly root = new Root(true)._setTree(this)
  readonly renderStack = new RenderStack()

  protected _currentViewport?: Viewport
  getCurrentViewport() { return this._currentViewport }
  setCurrentViewport(viewport: Viewport | undefined) { this._currentViewport = viewport }

  constructor(
    readonly timeline = new Timer(),
  ) {
    super()
    this.root.addChild(timeline, InternalMode.FRONT)
  }

  render(renderer: WebGLRenderer): void {
    this.emit('processing')
    this.root.notification('process')
    this.emit('processed')
    renderer.program.uniforms.projectionMatrix = this.root.toProjectionArray(true)
    this.renderStack.render(renderer)
    this._renderToScreen(renderer)
  }

  protected _renderToScreen(renderer: WebGLRenderer) {
    renderer.state.reset()
    const pixelRatio = renderer.pixelRatio
    const { width, height } = this.root
    renderer.framebuffer.bind(null)
    renderer.viewport.bind({
      x: 0,
      y: 0,
      width: width * pixelRatio,
      height: height * pixelRatio,
    })
    renderer.clear()
    const texture = this.root.texture
    texture.activate(renderer, 0)
    QuadUvGeometry.draw(renderer)
    renderer.texture.unbind(texture)
  }
}

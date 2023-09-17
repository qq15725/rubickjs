import { Projection2D } from '@rubickjs/math'
import { QuadUvGeometry } from '../geometries'
import { UvMaterial } from '../materials'
import { ViewportTexture } from '../textures'
import { Node } from '../Node'
import type { NodeProcessContext } from '../Node'
import type { WebGLRenderer } from '@rubickjs/renderer'
import type { Vector2 } from '@rubickjs/math'

export class Viewport extends Node {
  protected override _renderable = true

  /** Framebuffers */
  protected _framebufferIndex = 0
  protected _framebuffers = [
    { texture: new ViewportTexture({ width: 1, height: 1, pixels: null }) },
    { texture: new ViewportTexture({ width: 1, height: 1, pixels: null }) },
  ] as const

  get framebuffer() { return this._framebuffers[this._framebufferIndex] }

  /**
   * Viewport render texture
   */
  get texture() { return this.framebuffer.texture }

  /**
   * Projection transform
   */
  readonly projection: Projection2D
  get position(): Vector2 { return this.projection.position }
  set position(val: { x: number; y: number }) { this.projection.position.update(val.x, val.y) }
  get x(): number { return this.projection.position.x }
  set x(val: number) { this.projection.position.x = val }
  get y(): number { return this.projection.position.y }
  set y(val: number) { this.projection.position.y = val }
  get size(): Vector2 { return this.projection.size }
  set size(val: { x: number; y: number }) { this.projection.size.update(val.x, val.y) }
  get width() { return this.projection.size.x }
  set width(val: number) { this.projection.size.x = val }
  get height() { return this.projection.size.y }
  set height(val: number) { this.projection.size.y = val }

  /** Render call */
  protected _renderCallId = 0
  protected _renderCallViewport?: Viewport

  constructor(flipY = false) {
    super()

    this.projection = new Projection2D(0, 0, 0, 0, flipY)
  }

  glFramebufferProps(renderer: WebGLRenderer) {
    return {
      colorTextures: [this.texture.glTexture(renderer)],
    }
  }

  glFramebuffer(renderer: WebGLRenderer): WebGLFramebuffer {
    return renderer.getRelated(this.framebuffer, () => {
      return renderer.createFramebuffer(
        this.glFramebufferProps(renderer),
      )
    })
  }

  update(renderer: WebGLRenderer) {
    this.clearDirty()
    renderer.updateFramebuffer(
      this.glFramebuffer(renderer),
      this.glFramebufferProps(renderer),
    )
  }

  /**
   * Activate viewport
   */
  activate(renderer: WebGLRenderer, then?: () => void | false) {
    renderer.flush()

    const tree = this._tree
    const oldViewport = tree?.getCurrentViewport()
    tree?.setCurrentViewport(this)

    renderer.activeFramebuffer(this.glFramebuffer(renderer), () => {
      const [width, height] = this.size
      this._framebuffers.forEach(framebuffer => {
        framebuffer.texture.pixelRatio = renderer.pixelRatio
        framebuffer.texture.size.update(width, height)
        if (framebuffer.texture.isDirty) {
          framebuffer.texture.upload(renderer)
        }
      })
      if (this.isDirty) {
        this.update(renderer)
      }
      renderer.updateViewport(
        0, 0,
        width * renderer.pixelRatio, height * renderer.pixelRatio,
      )
      const result = then?.()
      if (result === false) {
        renderer.flush()
        tree?.setCurrentViewport(oldViewport)
      }

      return result
    })
  }

  /**
   * Redraw current viewport
   *
   * @param renderer
   * @param cb
   */
  redraw(renderer: WebGLRenderer, cb: () => void) {
    renderer.flush()
    const texture = this.framebuffer.texture
    this._framebufferIndex = (this._framebufferIndex + 1) % this._framebuffers.length
    this.activate(renderer)
    renderer.clear()
    texture.activate(renderer, 0)
    cb()
  }

  /**
   * Copy target viewport to current viewport
   *
   * @param renderer
   * @param target
   */
  activateWithCopy(renderer: WebGLRenderer, target: Viewport): void {
    this.size = target.size
    this.activate(renderer)
    renderer.clear()
    target.texture.activate(renderer, 0)
    QuadUvGeometry.draw(renderer, UvMaterial.instance, {
      sampler: 0,
    })
  }

  override process(context: NodeProcessContext): void {
    this._renderCallId = 0
    super.process(context)
    context.renderQueue.push(this)
  }

  protected override _render(renderer: WebGLRenderer) {
    if (this._renderCallId % 2 === 0) {
      this._renderCallViewport = this._tree?.getCurrentViewport()
      this.activate(renderer)
      renderer.clear()
    } else {
      const oldViewport = this._renderCallViewport
      this._renderCallViewport = undefined
      renderer.batch.flush()
      if (oldViewport) {
        oldViewport?.activate(renderer)
        this._tree?.setCurrentViewport(oldViewport)
      } else {
        renderer.activeFramebuffer(null)
        this._tree?.setCurrentViewport(undefined)
      }
    }

    this._renderCallId++
  }
}

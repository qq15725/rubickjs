import { Projection2D } from '@rubickjs/math'
import { QuadUvGeometry, UvMaterial, ViewportTexture } from '../resources'
import { Node } from './Node'
import type { WebGLRenderer } from '@rubickjs/renderer'
import type { Vector2 } from '@rubickjs/math'

export class Viewport extends Node {
  protected framebuffer = 0

  protected readonly framebuffers = [
    { texture: new ViewportTexture({ width: 1, height: 1, pixels: null }) },
    { texture: new ViewportTexture({ width: 1, height: 1, pixels: null }) },
  ] as const

  /**
   * Viewport render texture
   */
  get texture() { return this.framebuffers[this.framebuffer].texture }

  /**
   * Projection transform
   */
  readonly projection: Projection2D

  /**
   * Viewport x and y
   */
  get position(): Vector2 { return this.projection.position }
  set position(val: { x: number; y: number }) { this.projection.position.update(val.x, val.y) }

  get x(): number { return this.position.x }
  set x(val: number) { this.position.x = val }

  get y(): number { return this.position.y }
  set y(val: number) { this.position.y = val }

  /**
   * Viewport width and height
   */
  get size(): Vector2 { return this.projection.size }
  set size(val: { x: number; y: number }) { this.projection.size.update(val.x, val.y) }

  get width() { return this.size.x }
  set width(val: number) { this.size.x = val }

  get height() { return this.size.y }
  set height(val: number) { this.size.y = val }

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
    return renderer.getRelated(this.framebuffers[this.framebuffer], () => {
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
    // flush batch render
    renderer.flush()

    // bind current viewport to scene tree
    const tree = this.tree
    const oldViewport = tree?.activeViewport
    if (tree) {
      tree.activeViewport = this
    }

    // active WebGL framebuffer
    renderer.activeFramebuffer(this.glFramebuffer(renderer), () => {
      const [width, height] = this.size

      // update textures
      this.framebuffers.forEach(framebuffer => {
        framebuffer.texture.pixelRatio = renderer.pixelRatio
        framebuffer.texture.size.update(width, height)
        if (framebuffer.texture.isDirty) {
          framebuffer.texture.upload(renderer)
        }
      })

      // update WebGL framebuffer
      if (this.isDirty) {
        this.update(renderer)
      }

      renderer.updateViewport(
        0, 0,
        width * renderer.pixelRatio, height * renderer.pixelRatio,
      )

      // call then callback
      const result = then?.()

      // reset bind current viewport to scene tree
      if (result === false) {
        renderer.flush()
        if (tree) {
          tree.activeViewport = oldViewport
        }
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
    // flush batch render
    renderer.flush()

    // current framebuffer index
    const index = this.framebuffer

    // current texture
    const texture = this.framebuffers[index].texture

    // toggle to next framebuffer
    this.framebuffer = (index + 1) % this.framebuffers.length

    // active viewport
    this.activate(renderer)
    renderer.clear()

    // active texture
    texture.activate(renderer, 0)

    // call calback
    cb()
  }

  /**
   * Copy target viewport to current viewport
   *
   * @param renderer
   * @param target
   */
  copy(renderer: WebGLRenderer, target: Viewport): void {
    this.size = target.size
    this.activate(renderer)
    renderer.clear()
    target.texture.activate(renderer, 0)
    QuadUvGeometry.draw(renderer, UvMaterial.instance, {
      sampler: 0,
    })
  }

  /**
   * Process each frame
   *
   * @param renderer
   */
  override render(renderer: WebGLRenderer): void {
    this.activate(renderer, () => {
      renderer.clear()
      super.render(renderer)
      return false
    })
  }
}

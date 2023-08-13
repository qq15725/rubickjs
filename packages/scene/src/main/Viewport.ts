import { Projection2D } from '@rubickjs/math'
import { QuadUvGeometry, UvMaterial, ViewportTexture } from '../resources'
import { Node } from './Node'
import type { ObservablePoint } from '@rubickjs/math'

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
  get position(): ObservablePoint { return this.projection.position }
  set position(val: { x: number; y: number }) { this.projection.position.copy(val) }

  get x(): number { return this.position.x }
  set x(val: number) { this.position.x = val }

  get y(): number { return this.position.y }
  set y(val: number) { this.position.y = val }

  /**
   * Viewport width and height
   */
  get size(): ObservablePoint { return this.projection.size }
  set size(val: { x: number; y: number }) { this.projection.size.copy(val) }

  get width() { return this.size.x }
  set width(val: number) { this.size.x = val }

  get height() { return this.size.y }
  set height(val: number) { this.size.y = val }

  constructor(flipY = false) {
    super()

    this.projection = new Projection2D(0, 0, 0, 0, flipY)
  }

  getFramebufferProps() {
    return {
      colorTextures: [this.texture.getRelated()],
    }
  }

  getRelated() {
    const renderer = this.renderer
    return renderer.getRelated(this.framebuffers[this.framebuffer], () => {
      return renderer.createFramebuffer(this.getFramebufferProps())
    })
  }

  update() {
    const renderer = this.renderer
    this.dirty.clear()
    renderer.updateFramebuffer(this.getRelated(), this.getFramebufferProps())
  }

  /**
   * Clear current viewport
   */
  clear() {
    this.renderer.clear()
  }

  /**
   * Activate viewport
   *
   * @param then
   */
  activate(then?: () => void | false) {
    const renderer = this.renderer

    // flush batch render
    renderer.flush()

    // bind current viewport to scene tree
    const tree = this.tree
    const oldViewport = tree?.viewport
    if (tree) {
      tree.viewport = this
    }

    // active WebGL framebuffer
    renderer.activeFramebuffer(this.getRelated(), () => {
      const { x: width, y: height } = this.size

      // update textures
      this.framebuffers.forEach(framebuffer => {
        framebuffer.texture.pixelRatio = renderer.pixelRatio
        framebuffer.texture.size.set(width, height)
        if (framebuffer.texture.dirty.size > 0) {
          framebuffer.texture.update()
        }
      })

      // update WebGL framebuffer
      if (this.dirty.size > 0) {
        this.update()
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
          tree.viewport = oldViewport
        }
      }

      return result
    })
  }

  /**
   * Redarw current viewport
   *
   * @param cb
   */
  redarw(cb: () => void) {
    // flush batch render
    this.renderer.flush()

    // current framebuffer index
    const index = this.framebuffer

    // current texture
    const texture = this.framebuffers[index].texture

    // toggle to next framebuffer
    this.framebuffer = (index + 1) % this.framebuffers.length

    // active viewport
    this.activate()
    this.clear()

    // active texture
    texture.activate(0)

    // call calback
    cb()
  }

  /**
   * Copy target viewport to current viewport
   *
   * @param target
   */
  copy(target: Viewport): void {
    this.activate()
    this.clear()
    target.texture.activate(0)
    QuadUvGeometry.instance.draw(UvMaterial.instance, {
      sampler: 0,
    })
  }

  /**
   * Process each frame
   *
   * @param delta
   */
  process(delta: number): void {
    this.activate(() => {
      this.clear()
      super.process(delta)
      return false
    })
  }
}

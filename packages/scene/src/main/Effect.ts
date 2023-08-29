import { EffectMaterial, QuadUvGeometry } from '../resources'
import { Node } from './Node'
import { Viewport } from './Viewport'
import type { WebGLRenderer } from '@rubickjs/renderer'
import type { CanvasItem } from './CanvasItem'
import type { Texture } from '../resources'

export enum EffectFlags {
  /**
   * Apply the effect to the child node and render it to the before viewport
   */
  DEFAULT = 0,

  /**
   * Apply the effect to the before viewport
   */
  BEFORE = 1,

  /**
   * Copy the before viewport and apply the effect to effect viewport
   */
  COPY_BEFORE = 2,
}

export interface EffectContext {
  /**
   * Redraw
   */
  redraw?: boolean

  /**
   * Apply the target node of the effect
   */
  target?: CanvasItem

  /**
   * Relative duration of time
   */
  time?: number

  /**
   * from viewport during transition
   */
  from?: Viewport

  /**
   * to viewport during transition
   */
  to?: Viewport
}

export class Effect extends Node {
  /**
   * Disabled
   */
  disabled = false

  /**
   * Flags
   */
  flags = EffectFlags.DEFAULT

  /**
   * Duration
   */
  duration = 2000

  /**
   * The source canvas element is rendered after the viewport
   */
  readonly viewport = new Viewport()

  /**
   * The target canvas element is rendered after the viewport
   */
  readonly viewport2 = new Viewport()

  /**
   * Material
   */
  material?: EffectMaterial

  constructor(glsl?: string) {
    super()

    if (glsl) {
      this.material = new EffectMaterial(glsl)
    }
  }

  /**
   * Set effect disabled
   *
   * @param val
   */
  setDisabled(val: boolean): this {
    this.disabled = val
    return this
  }

  /**
   * Set effect flags
   *
   * @param val
   */
  setFlags(val: EffectFlags): this {
    this.flags = val
    return this
  }

  /**
   * Set effect duration
   *
   * @param val
   */
  setDuration(val: number): this {
    this.duration = val
    return this
  }

  /**
   * Process each frame
   *
   * @param renderer
   */
  render(renderer: WebGLRenderer) {
    if (this.disabled || !this.isVisible()) {
      return
    }

    const oldViewport = this.currentViewport
    const viewport = this.viewport

    switch (this.flags) {
      case EffectFlags.DEFAULT:
        if (oldViewport) {
          viewport.size.update(oldViewport.width, oldViewport.height)
          viewport.copy(renderer, oldViewport)
        } else {
          viewport.activate(renderer)
        }
        super.render(renderer)
        this.apply(renderer, viewport, {
          redraw: true,
        })
        if (oldViewport) {
          oldViewport.activate(renderer)
          viewport.texture.activate(renderer, 0)
          QuadUvGeometry.draw(renderer)
        }
        break
      case EffectFlags.BEFORE:
        super.render(renderer)
        oldViewport && this.apply(renderer, oldViewport, {
          redraw: true,
        })
        break
      case EffectFlags.COPY_BEFORE:
        if (oldViewport) {
          viewport.size.update(oldViewport.width, oldViewport.height)
          viewport.copy(renderer, oldViewport)
        } else {
          viewport.activate(renderer)
        }
        super.render(renderer)
        this.apply(renderer, viewport, {
          redraw: true,
        })
        oldViewport?.activate(renderer)
        break
    }
  }

  /**
   * Apply effect to texture
   */
  redrawTexture(renderer: WebGLRenderer, texture: Texture, node: CanvasItem): Texture | undefined {
    if (this.disabled) {
      return undefined
    }
    const oldViewport = node.currentViewport
    const viewport = this.viewport
    viewport.size = texture.size
    viewport.activate(renderer)
    renderer.clear()
    texture.activate(renderer, 0)
    QuadUvGeometry.draw(renderer)
    this.apply(renderer, viewport, {
      redraw: true,
      target: node,
    })
    oldViewport?.activate(renderer)
    return viewport.texture
  }

  /**
   * Apply effect
   *
   * @param renderer
   * @param viewport Render the target viewport
   * @param context
   */
  apply(renderer: WebGLRenderer, viewport: Viewport, context?: EffectContext): void {
    if (this.disabled || !this.material) return

    const progress = (context?.time ?? 0) / this.duration

    if (context?.redraw) {
      viewport.redraw(renderer, () => {
        QuadUvGeometry.draw(renderer, this.material!, {
          from: 0,
          to: 1,
          progress,
          ratio: viewport.width / viewport.height,
        })
      })
    } else {
      QuadUvGeometry.draw(renderer, this.material, {
        from: 0,
        to: 1,
        progress,
        ratio: context?.from ? context.from.width / context.from.height : 0,
      })
    }
  }
}

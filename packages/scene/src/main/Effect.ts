import { EffectMaterial, QuadUvGeometry } from '../resources'
import { Node } from './Node'
import { Viewport } from './Viewport'
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
   * @param delta
   */
  process(delta: number) {
    if (this.disabled || !this.isVisible()) {
      return
    }

    const oldViewport = this.currentViewport
    const viewport = this.viewport

    switch (this.flags) {
      case EffectFlags.DEFAULT:
        if (oldViewport) {
          viewport.size.update(oldViewport.width, oldViewport.height)
          viewport.copy(oldViewport)
        } else {
          viewport.activate()
        }
        super.process(delta)
        this.apply(viewport, {
          redraw: true,
        })
        if (oldViewport) {
          oldViewport.activate()
          viewport.texture.activate(0)
          QuadUvGeometry.draw()
        }
        break
      case EffectFlags.BEFORE:
        super.process(delta)
        oldViewport && this.apply(oldViewport, {
          redraw: true,
        })
        break
      case EffectFlags.COPY_BEFORE:
        if (oldViewport) {
          viewport.size.update(oldViewport.width, oldViewport.height)
          viewport.copy(oldViewport)
        } else {
          viewport.activate()
        }
        super.process(delta)
        this.apply(viewport, {
          redraw: true,
        })
        oldViewport?.activate()
        break
    }
  }

  /**
   * Apply effect to texture
   */
  redrawTexture(texture: Texture, node: CanvasItem): Texture | undefined {
    if (this.disabled) {
      return undefined
    }
    const oldViewport = node.currentViewport
    const viewport = this.viewport
    viewport.size = texture.size
    viewport.activate()
    viewport.clear()
    texture.activate(0)
    QuadUvGeometry.draw()
    this.apply(viewport, {
      redraw: true,
      target: node,
    })
    oldViewport?.activate()
    return viewport.texture
  }

  /**
   * Apply effect
   *
   * @param viewport Render the target viewport
   * @param context
   */
  apply(viewport: Viewport, context?: EffectContext): void {
    if (this.disabled || !this.material) return

    const progress = (context?.time ?? 0) / this.duration

    if (context?.redraw) {
      viewport.redraw(() => {
        QuadUvGeometry.draw(this.material!, {
          from: 0,
          to: 1,
          progress,
          ratio: viewport.width / viewport.height,
        })
      })
    } else {
      QuadUvGeometry.draw(this.material, {
        from: 0,
        to: 1,
        progress,
        ratio: context?.from ? context.from.width / context.from.height : 0,
      })
    }
  }
}

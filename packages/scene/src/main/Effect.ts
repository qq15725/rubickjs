import { EffectMaterial, QuadUvGeometry } from '../resources'
import { Node } from './Node'
import { Viewport } from './Viewport'
import { CanvasItem } from './CanvasItem'

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
   * Offset time
   */
  offset?: number

  /**
   * The source canvas element is rendered after the viewport
   */
  readonly source = new Viewport()

  /**
   * The target canvas element is rendered after the viewport
   */
  readonly target = new Viewport()

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
    if (this.disabled) {
      return
    }

    const viewport = this.activeViewport
    const source = this.source

    switch (this.flags) {
      case EffectFlags.DEFAULT:
        if (viewport) {
          source.size.set(viewport.width, viewport.height)
          source.copy(viewport)
        } else {
          source.activate()
        }
        super.process(delta)
        this.apply(source)
        if (viewport) {
          viewport.activate()
          source.texture.activate(0)
          QuadUvGeometry.draw()
        }
        break
      case EffectFlags.BEFORE:
        super.process(delta)
        viewport && this.apply(viewport)
        break
      case EffectFlags.COPY_BEFORE:
        if (viewport) {
          source.size.set(viewport.width, viewport.height)
          source.copy(viewport)
        } else {
          source.activate()
        }
        super.process(delta)
        this.apply(source)
        viewport?.activate()
        break
    }
  }

  /**
   * Apply transition effect
   *
   * @param fromItem
   */
  applyTransition(fromItem: CanvasItem): boolean {
    if (this.disabled) {
      return false
    }

    const toItem = fromItem.nextSibling
    const target = fromItem.activeViewport

    if (toItem instanceof CanvasItem && target) {
      const duration = this.duration
      const currentTime = fromItem.currentTime
      const fromItemEndTime = fromItem.visibleTime + (fromItem.visibleDuration ?? 0)
      const nextItemStartTime = toItem.visibleTime + (toItem.visibleDuration ?? 0)
      const startTime = fromItemEndTime - (this.offset ?? duration / 2)
      const endTime = startTime + duration
      if (currentTime >= startTime && currentTime <= endTime) {
        toItem.transitioning = true
        const from = this.source
        const to = this.target

        const width = target.width
        const height = target.height
        from.size.set(width, height)
        to.size.set(width, height)

        from.activate()
        from.clear()
        fromItem.render(Math.min(fromItemEndTime, currentTime))

        to.activate()
        to.clear()
        toItem.render(Math.max(nextItemStartTime, currentTime))

        target.activate()
        from.texture.activate(0)
        to.texture.activate(1)
        this.apply(target, { time: currentTime - startTime, from, to })
        const rendeer = this.renderer
        rendeer.activeTexture({ target: 'texture_2d', unit: 0, value: null })
        rendeer.activeTexture({ target: 'texture_2d', unit: 1, value: null })
        return true
      } else {
        toItem.transitioning = false
      }
    }
    return false
  }

  /**
   * Apply effect
   *
   * @param source Render the target viewport
   * @param context
   */
  apply(source: Viewport, context?: EffectContext): void {
    if (this.disabled || !this.material) return

    const progress = (context?.time ?? 0) / this.duration

    if (context?.from) {
      QuadUvGeometry.instance.draw(this.material, {
        from: 0,
        to: 1,
        progress,
        ratio: context.from.width / context.from.height,
      })
    } else {
      source.redarw(() => {
        QuadUvGeometry.instance.draw(this.material!, {
          from: 0,
          progress,
          ratio: source.width / source.height,
        })
      })
    }
  }
}

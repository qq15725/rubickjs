import { Color } from '@rubickjs/math'
import { Material, QuadGeometry, QuadUvGeometry } from '../resources'
import { Node } from './Node'
import { Viewport } from './Viewport'
import type { Effect } from './Effect'
import type { Texture } from '../resources'
import type { ColorValue } from '@rubickjs/math'

export class CanvasItem extends Node {
  /**
   * Background color
   */
  protected readonly _backgroundColor = new Color()
  protected _backgroundColorValue?: ColorValue
  get backgroundColor(): Color { return this._backgroundColor }
  set backgroundColor(value: ColorValue) {
    if (this._backgroundColorValue !== value) {
      this._backgroundColorValue = value
      this._backgroundColor.normalize(value)
    }
  }

  /**
   * Tint
   */
  readonly tint = new Color()

  /**
   * The viewport associated with this canvas item
   */
  readonly viewport = new Viewport()

  /**
   * Filter
   */
  filter?: Effect

  /**
   * Animation
   */
  animationEnter?: Effect
  animation?: Effect
  animationLeave?: Effect

  /**
   * Transition
   */
  transition?: Effect
  transitioning = false

  /**
   * Whether to display in the scene
   */
  visible = true
  visibleTime = 0
  visibleDuration?: number

  isVisible(currentTime?: number) {
    if (this.visible) {
      const time = this.visibleTime
      const duration = this.visibleDuration
      currentTime = currentTime ?? this.currentTime

      if (
        time <= currentTime
        && (duration === undefined || (time + duration) >= currentTime)
      ) {
        return true
      }
    }
    return false
  }

  /**
   * Apply all effects to the texture source
   *
   * @param source
   */
  applyEffects(source: Texture): Texture {
    if (
      this.animationEnter?.disabled === false
      || this.animation?.disabled === false
      || this.animationLeave?.disabled === false
      || this.filter?.disabled === false
    ) {
      const viewport = this.viewport
      const activeViewport = this.activeViewport
      viewport.size.set(source.width, source.height)
      viewport.activate()
      viewport.clear()
      source.activate(0)
      QuadUvGeometry.draw()

      // animation
      let time = this.currentTime - this.visibleTime
      if (time >= 0 && (this.visibleDuration === undefined || time < this.visibleDuration)) {
        if (this.animationEnter && !this.animationEnter.disabled && time >= 0) {
          if (time < this.animationEnter.duration) {
            this.animationEnter.apply(viewport, { target: this, time })
          }
          time -= this.animationEnter.duration
        }
        if (this.animation && !this.animation.disabled && time >= 0) {
          if (time < this.animation.duration) {
            this.animation.apply(viewport, { target: this, time })
          }
          time -= this.animation.duration
        }
        if (this.animationLeave && !this.animationLeave.disabled && time >= 0) {
          if (time < this.animationLeave.duration) {
            this.animationLeave.apply(viewport, { target: this, time })
          }
        }
      }

      // filter
      if (this.filter?.disabled === false) {
        this.filter.apply(viewport, { target: this })
      }

      activeViewport?.activate()
      return viewport.texture
    }

    return source
  }

  process(delta: number) {
    super.process(delta)

    const currentTime = this.currentTime

    if (
      !this.transitioning
      && (this.transition?.disabled !== false || !this.transition?.applyTransition(this))
      && this.isVisible(currentTime)
    ) {
      this.render(currentTime)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(currentTime: number): void {
    QuadGeometry.instance.draw(Material.instance, {
      tint: this.tint.toArray(),
    })
  }
}

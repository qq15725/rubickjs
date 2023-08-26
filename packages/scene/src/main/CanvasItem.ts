import { clamp } from '@rubickjs/math'
import { Color, ColorMatrix } from '@rubickjs/color'
import { Ref } from '@rubickjs/shared'
import { CanvasItemStyle } from '../resources'
import { Node } from './Node'
import { Viewport } from './Viewport'
import type { ColorValue } from '@rubickjs/color'
import type { Effect } from './Effect'

interface RenderFunc {
  (viewport: Viewport): void
}

interface RenderWithEffectFunc {
  (render: (viewport: Viewport) => void): RenderFunc
}

export class CanvasItem extends Node {
  /**
   * The viewport associated with this canvas item
   */
  readonly viewport = new Viewport()

  /**
   * Style
   */
  protected _style = new CanvasItemStyle(this)
  get style() { return this._style }
  set style(val) { this._style.update(val) }

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

  /**
   * Tint
   */
  protected _tint = new Color(0xFFFFFF)
  get tint(): ColorValue { return this._tint.value }
  set tint(val) { this._tint.value = val }

  /**
   * Alpha
   */
  protected _alpha = new Ref(1)
  get alpha(): number { return this._alpha.value }
  set alpha(val) { this._alpha.value = clamp(0, val, 1) }

  /**
   * Global alpha
   */
  protected _globalAlpha = new Ref(this.alpha)
  get globalAlpha(): number { return this._globalAlpha.value }

  /**
   * Background color
   */
  protected _backgroundColor = new Color(0x00000000)
  get backgroundColor(): ColorValue { return this._backgroundColor.value }
  set backgroundColor(val) { this._backgroundColor.value = val }

  /**
   * Color matrix
   */
  readonly colorMatrix = new ColorMatrix()

  constructor() {
    super()
    this._alpha.on('update', this._onUpdateAlpha.bind(this))
  }

  protected _onUpdateAlpha() {
    this.addDirty('alpha')
  }

  /**
   * Update alpha
   */
  updateAlpha(): void {
    if (this.hasDirty('alpha')) {
      this.deleteDirty('alpha')
      if (this.owner instanceof CanvasItem) {
        this._globalAlpha.value = this.alpha * this.owner.globalAlpha
      } else {
        this._globalAlpha.value = this.alpha
      }

      for (let len = this.children.length, i = 0; i < len; i++) {
        this.children[i].addDirty('alpha')
      }
    }
  }

  override process(delta: number) {
    this.updateAlpha()
    const currentTime = this.currentTime
    const currentViewport = this.currentViewport
    if (currentViewport) {
      this._withEffects(currentTime, currentViewport, () => {
        super.process(delta)
        this._render(currentTime)
      })
    } else {
      super.process(delta)
      this._render(currentTime)
    }
  }

  protected _withTransition(currentTime: number): RenderWithEffectFunc | undefined {
    const transitionTime = currentTime - this.visibleTime
    const transition = this.transition

    if (
      transition
      && !transition.disabled
      && transitionTime <= transition.duration
    ) {
      return render => renderViewport => {
        const {
          viewport: from,
          viewport2: to,
        } = transition

        from.copy(renderViewport)
        to.size = renderViewport.size
        to.activate()
        to.clear()
        render(to)

        renderViewport.activate()
        renderViewport.clear()
        from.texture.activate(0)
        to.texture.activate(1)

        transition.apply(renderViewport, {
          time: transitionTime,
          from,
          to,
        })

        const renderer = this.renderer
        renderer.activeTexture({ target: 'texture_2d', unit: 0, value: null })
        renderer.activeTexture({ target: 'texture_2d', unit: 1, value: null })
      }
    }

    return undefined
  }

  protected _withAnimation(currentTime: number): RenderWithEffectFunc | undefined {
    const animations = [
      this.animationEnter,
      this.animation,
      this.animationLeave,
    ]

    let animationTime = currentTime - this.visibleTime
    let currentAnimation: Effect | undefined

    for (let len = animations.length, i = 0; i < len; i++) {
      const animation = animations[i]
      if (!animation || animation.disabled) continue
      if (animationTime < animation.duration) {
        currentAnimation = animation
        break
      }
      animationTime -= animation.duration
    }

    if (currentAnimation) {
      return render => renderViewport => {
        const viewport = this.viewport
        viewport.size = renderViewport.size
        viewport.activate()
        viewport.clear()
        render(viewport)
        renderViewport.activate()
        viewport.texture.activate(0)
        currentAnimation!.apply(renderViewport, {
          target: this,
          time: animationTime,
        })
      }
    }

    return undefined
  }

  protected _withEffects(currentTime: number, currentViewport: Viewport, render: RenderFunc): void {
    render = this._withAnimation(currentTime)?.(render) ?? render
    render = this._withTransition(currentTime)?.(render) ?? render
    render(currentViewport)
  }

  /**
   * Render
   *
   * @param currentTime
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected _render(currentTime: number): void {}
}

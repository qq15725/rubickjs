import { clamp } from '@rubickjs/math'
import { Color, ColorMatrix } from '@rubickjs/color'
import { Ref } from '@rubickjs/shared'
import { CanvasItemStyle } from '../resources'
import { Node } from './Node'
import { Viewport } from './Viewport'
import type { WebGLRenderer } from '@rubickjs/renderer'
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
      if (this.parentNode instanceof CanvasItem) {
        this._globalAlpha.value = this.alpha * this.parentNode.globalAlpha
      } else {
        this._globalAlpha.value = this.alpha
      }

      for (let len = this.childNodes.length, i = 0; i < len; i++) {
        this.childNodes[i].addDirty('alpha')
      }
    }
  }

  protected override _process(delta: number) {
    super._process(delta)
    this.updateAlpha()
  }

  override render(renderer: WebGLRenderer) {
    if (this.isRenderable()) {
      const currentTime = this.timeline?.currentTime ?? 0
      const currentViewport = this.currentViewport
      if (currentViewport) {
        this._renderWithEffects(renderer, currentTime, currentViewport, () => {
          this._render(renderer)
          this._renderChildNodes(renderer)
        })
      } else {
        this._render(renderer)
        this._renderChildNodes(renderer)
      }
    }
  }

  protected _renderWithTransition(
    renderer: WebGLRenderer,
    currentTime: number,
  ): RenderWithEffectFunc | undefined {
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

        from.copy(renderer, renderViewport)
        to.size = renderViewport.size
        to.activate(renderer)
        renderer.clear()
        render(to)

        renderViewport.activate(renderer)
        renderer.clear()
        from.texture.activate(renderer, 0)
        to.texture.activate(renderer, 1)

        transition.apply(renderer, renderViewport, {
          time: transitionTime,
          from,
          to,
        })

        renderer.activeTexture({ target: 'texture_2d', unit: 0, value: null })
        renderer.activeTexture({ target: 'texture_2d', unit: 1, value: null })
      }
    }

    return undefined
  }

  protected _renderWithAnimation(
    renderer: WebGLRenderer,
    currentTime: number,
  ): RenderWithEffectFunc | undefined {
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
        viewport.activate(renderer)
        renderer.clear()
        render(viewport)
        renderViewport.activate(renderer)
        viewport.texture.activate(renderer, 0)
        currentAnimation!.apply(renderer, renderViewport, {
          target: this,
          time: animationTime,
        })
      }
    }

    return undefined
  }

  protected _renderWithEffects(renderer: WebGLRenderer, currentTime: number, currentViewport: Viewport, render: RenderFunc): void {
    render = this._renderWithAnimation(renderer, currentTime)?.(render) ?? render
    render = this._renderWithTransition(renderer, currentTime)?.(render) ?? render
    render(currentViewport)
  }
}

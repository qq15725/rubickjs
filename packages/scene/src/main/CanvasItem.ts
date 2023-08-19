import { Color, Transform2D, Vector2 } from '@rubickjs/math'
import { DEG_TO_RAD, RAD_TO_DEG } from '@rubickjs/shared'
import { Node } from './Node'
import { Viewport } from './Viewport'
import type { Effect } from './Effect'

interface RenderFunc {
  (viewport: Viewport): void
}

interface RenderWithEffectFunc {
  (render: (viewport: Viewport) => void): RenderFunc
}

export class CanvasItem extends Node {
  /**
   * Transform relative to parent node
   */
  readonly transform = new Transform2D()

  /**
   * The transform origin is the point around which a transformation is applied
   *
   * (0 - 1), (0 - 1)
   */
  protected _transformOrigin = new Vector2(0.5, 0.5)
  get transformOrigin(): Vector2 { return this._transformOrigin }
  set transformOrigin(val: { x: number; y: number }) { this._transformOrigin.update(val.x, val.y) }

  /**
   * Size
   */
  readonly size = new Vector2(0, 0)
  get width() { return this.size.x }
  set width(val) { this.size.x = val }
  get height() { return this.size.y }
  set height(val) { this.size.y = val }

  /**
   * Position relative to parent node
   */
  get position(): Vector2 { return this.transform.position }
  set position(val: { x: number; y: number }) { this.transform.position.update(val.x, val.y) }
  get x(): number { return this.position.x }
  set x(val: number) { this.position.x = val }
  get y(): number { return this.position.y }
  set y(val: number) { this.position.y = val }

  /**
   * Scale, unscaled values of this node (1, 1)
   */
  get scale(): Vector2 { return this.transform.scale }
  set scale(val: { x: number; y: number }) { this.transform.scale.update(val.x, val.y) }

  /**
   * The skew factor for the object in radians.
   */
  get skew(): Vector2 { return this.transform.skew }
  set skew(val: { x: number; y: number }) { this.transform.skew.update(val.x, val.y) }

  /**
   * The rotation of the object in radians.
   * 'rotation' and 'angle' have the same effect on a display object; rotation is in radians, angle is in degrees.
   */
  get rotation(): number { return this.transform.rotation }
  set rotation(val) { this.transform.rotation = val }

  /** Background color */
  protected _backgroundColor = new Color()
  get backgroundColor() { return this._backgroundColor.value }
  set backgroundColor(val) { this._backgroundColor.value = val }

  /** CSS style */
  override get style() { return this._getStyle() }
  override set style(val) { this._updateStyle(val) }

  /**
   * The viewport associated with this canvas item
   */
  readonly viewport = new Viewport()

  /** Filter */
  filter?: Effect

  /** Animation */
  animationEnter?: Effect
  animation?: Effect
  animationLeave?: Effect

  /** Transition */
  transition?: Effect

  constructor() {
    super()
    this.size.onUpdate(this._onUpdateSize.bind(this))
    this.transformOrigin.onUpdate(this._onUpdateTransformOrigin.bind(this))
  }

  protected _onUpdateSize() {
    this.addDirty('size')
  }

  protected _onUpdateTransformOrigin() {
    this.addDirty('transformOrigin')
  }

  protected override _getStyle() {
    const {
      size,
      transform: {
        position,
        rotation,
      },
      transformOrigin,
    } = this

    return {
      ...super._getStyle(),
      left: position[0],
      top: position[1],
      width: size[0],
      height: size[1],
      rotate: rotation * RAD_TO_DEG,
      backgroundColor: this.backgroundColor,
      transformOrigin: `${ transformOrigin[0] }, ${ transformOrigin[1] }`,
    }
  }

  protected override _updateStyle(val: Record<string, any>) {
    super._updateStyle(val)

    const {
      left,
      top,
      width,
      height,
      rotate,
      backgroundColor,
      transformOrigin,
    } = val

    const { size, transform } = this

    if (typeof left !== 'undefined' || typeof top !== 'undefined') {
      const { position } = transform
      position.update(left ?? position[0], top ?? position[1])
    }

    if (typeof width !== 'undefined' || typeof height !== 'undefined') {
      size.update(width ?? size[0], height ?? size[1])
    }

    if (typeof rotate !== 'undefined') {
      transform.rotation = rotate * DEG_TO_RAD
    }

    if (typeof backgroundColor !== 'undefined') {
      this.backgroundColor = backgroundColor
    }

    if (typeof transformOrigin !== 'undefined') {
      const result = transformOrigin.split(',').map((val: string) => Number(val.trim()))
      this.transformOrigin.update(result[0], result[1])
    }
  }

  override process(delta: number) {
    const currentTime = this.currentTime
    if (this.isVisible(currentTime)) {
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

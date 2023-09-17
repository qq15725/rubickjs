import { Node, QuadUvGeometry, Viewport } from '@rubickjs/core'
import { EffectMaterial } from './EffectMaterial'
import type { Material, NodeProcessContext, RenderQueue, SceneTree } from '@rubickjs/core'
import type { WebGLRenderer } from '@rubickjs/renderer'

export type EffectMode =
// Apply the effect to all previous nodes
  | 'before'
  // Apply the effect to parent node
  | 'parent'
  // Apply the effect to all child nodes
  | 'children'
  // Apply the effect to previous node and next node
  | 'transition'

export interface EffectOptions {
  mode?: EffectMode
  duration?: number
  glsl?: string
  material?: Material
}

export interface EffectContext {
  /** Redraw */
  redraw?: boolean
  /** Apply the target node of the effect */
  target?: Node
  /** The from viewport during transition */
  from?: Viewport
  /** The to viewport during transition */
  to?: Viewport
}

export class Effect extends Node {
  protected override _renderable = true

  /** Viewports */
  readonly viewport = new Viewport()
  readonly viewport2 = new Viewport()

  /** Material */
  material?: Material

  /** Mode */
  protected _mode!: EffectMode
  get mode() { return this._mode }
  set mode(val) { this._mode = val }

  /** Render call */
  protected _renderCallId = 0
  protected _renderCallViewport?: Viewport

  /** Temporary nodes for transition */
  protected _previousSibling?: Node
  protected _nextSibling?: Node

  constructor(options?: EffectOptions) {
    super()

    this._mode = options?.mode ?? 'parent'

    if (options?.duration) {
      this.visibleDuration = options.duration
    }

    if (options?.material) {
      this.material = options.material
    } else if (options?.glsl) {
      const material = new EffectMaterial(options.glsl)
      if (!options?.mode && material.has.transition) {
        this._mode = 'transition'
      }
      this.material = material
    }
  }

  protected _enterTree(tree: SceneTree) {
    super._enterTree(tree)
    tree.on('processStart', this._onGlobalProcessStart)
    tree.on('processEnd', this._onGlobalProcessEnd)
    tree.renderQueue.on('pushStart', this._onRenderQueuePushStart)
    tree.renderQueue.on('pushEnd', this._onRenderQueuePushEnd)
  }

  protected _exitTree(tree: SceneTree) {
    super._exitTree(tree)
    tree.off('processStart', this._onGlobalProcessStart)
    tree.off('processEnd', this._onGlobalProcessEnd)
    tree.renderQueue.off('pushStart', this._onRenderQueuePushStart)
    tree.renderQueue.off('pushEnd', this._onRenderQueuePushEnd)
  }

  protected _onGlobalProcessStart = () => {
    switch (this._mode) {
      case 'transition':
        this._previousSibling = this.previousSibling
        this._nextSibling = this.nextSibling
        break
    }
  }

  protected _onGlobalProcessEnd = () => {
    this._previousSibling = undefined
    this._nextSibling = undefined
  }

  protected _onRenderQueuePushStart = (renderable: Node, renderQueue: RenderQueue) => {
    if (!this.needsRender()) return

    switch (this._mode) {
      case 'parent':
        if (renderable === this._parentNode) {
          renderQueue.push(this)
        }
        break
    }
  }

  protected _onRenderQueuePushEnd = (renderable: Node, renderQueue: RenderQueue) => {
    if (!this.needsRender()) return

    switch (this._mode) {
      case 'parent':
        if (renderable === this._parentNode) {
          renderQueue.push(this)
        }
        break
      case 'transition':
        if (renderable === this._previousSibling) {
          this._previousSibling = undefined
          renderQueue.push(this)
        } else if (renderable === this._nextSibling) {
          this._nextSibling = undefined
          renderQueue.push(this)
        }
        break
    }
  }

  override process(context: NodeProcessContext): void {
    this._renderCallId = 0
    switch (this._mode) {
      case 'before':
        super.process(context)
        break
      case 'children':
        if (this.childNodes.length) {
          super.process(context)
          context.renderQueue.push(this)
        }
        break
    }
  }

  protected override _render(renderer: WebGLRenderer) {
    const tree = this._tree

    switch (this._mode) {
      case 'before': {
        const viewport = tree?.getCurrentViewport()
        if (viewport) {
          this.apply(renderer, viewport, { redraw: true })
        }
        break
      }
      case 'transition': {
        if (this._renderCallId % 2 === 0) {
          this._renderCallViewport = tree?.getCurrentViewport()
          if (this._renderCallViewport) {
            this.viewport.activateWithCopy(renderer, this._renderCallViewport)
            this.viewport2.size = this._renderCallViewport.size
          }
          this.viewport2.activate(renderer)
          tree?.setCurrentViewport(this.viewport2)
          renderer.clear()
        } else {
          const oldViewport = this._renderCallViewport
          this._renderCallViewport = undefined
          if (oldViewport) {
            oldViewport.activate(renderer)
            tree?.setCurrentViewport(oldViewport)
            renderer.clear()
            this.viewport.texture.activate(renderer, 0)
            this.viewport2.texture.activate(renderer, 1)
            this.apply(renderer, oldViewport, {
              from: this.viewport,
              to: this.viewport2,
            })
            renderer.activeTexture({ value: null, unit: 0 })
            renderer.activeTexture({ value: null, unit: 1 })
          }
        }
        break
      }
      case 'parent':
      case 'children':
      default: {
        if (this._renderCallId % 2 === 0) {
          this._renderCallViewport = tree?.getCurrentViewport()
          if (this._renderCallViewport) {
            this.viewport.size = this._renderCallViewport.size
          }
          this.viewport.activate(renderer)
          tree?.setCurrentViewport(this.viewport)
          renderer.clear()
        } else {
          const oldViewport = this._renderCallViewport
          this._renderCallViewport = undefined
          if (oldViewport) {
            this.viewport.activate(renderer)
            this.apply(renderer, this.viewport, { redraw: true })
            oldViewport.activate(renderer)
            tree?.setCurrentViewport(oldViewport)
            this.viewport.texture.activate(renderer, 0)
            QuadUvGeometry.draw(renderer)
          }
        }
        break
      }
    }

    this._renderCallId++
  }

  apply(renderer: WebGLRenderer, viewport: Viewport, context?: EffectContext): void {
    if (!this.material) {
      return
    }

    if (context?.redraw) {
      viewport.redraw(renderer, () => {
        QuadUvGeometry.draw(renderer, this.material!, {
          from: 0,
          to: 1,
          progress: this.visibleProgress,
          ratio: viewport.width / viewport.height,
        })
      })
    } else {
      QuadUvGeometry.draw(renderer, this.material, {
        from: 0,
        to: 1,
        progress: this.visibleProgress,
        ratio: context?.from ? context.from.width / context.from.height : 0,
      })
    }
  }
}

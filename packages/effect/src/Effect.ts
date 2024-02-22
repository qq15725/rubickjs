import { Node, QuadUvGeometry, Viewport, customNode } from '@rubickjs/core'
import { EffectMaterial } from './EffectMaterial'
import type { Material } from '@rubickjs/core'
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

@customNode({
  tag: 'effect',
  renderable: true,
})
export class Effect extends Node {
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

  protected _enterTree() {
    const tree = this._tree!
    tree.on('processing', this._onProcessing)
    tree.on('nodeProcessing', this._onNodeProcessing)
    tree.on('nodeProcessed', this._onNodeProcessed)
  }

  protected _exitTree() {
    const tree = this._tree!
    tree.off('processing', this._onProcessing)
    tree.off('nodeProcessing', this._onNodeProcessing)
    tree.off('nodeProcessed', this._onNodeProcessed)
  }

  protected _onProcessing = () => {
    switch (this._mode) {
      case 'transition':
        this._previousSibling = this.previousSibling
        this._nextSibling = this.nextSibling
        break
      default:
        this._previousSibling = undefined
        this._nextSibling = undefined
        break
    }
  }

  protected _onNodeProcessing = (node: Node) => {
    if (!this.isRenderable()) return

    const renderStack = this._tree?.renderStack

    if (!renderStack) {
      return
    }

    switch (this._mode) {
      case 'parent':
        if (node === this._parent) {
          renderStack.push(this)
        }
        break
    }
  }

  protected _onNodeProcessed = (node: Node) => {
    if (!this.isRenderable()) return

    const renderStack = this._tree?.renderStack

    if (!renderStack) {
      return
    }

    switch (this._mode) {
      case 'parent':
        if (node === this._parent) {
          renderStack.push(this)
        }
        break
      case 'transition':
        if (node === this._previousSibling) {
          this._previousSibling = undefined
          renderStack.push(this)
        } else if (node === this._nextSibling) {
          this._nextSibling = undefined
          renderStack.push(this)
        }
        break
    }
  }

  override notification(what: string) {
    switch (what) {
      case 'process':
        this._renderCallId = 0
        switch (this._mode) {
          case 'before':
            super.notification(what)
            break
          case 'children':
            if (this._children.length) {
              super.notification(what)
              this._tree?.renderStack.push(this)
            }
            break
        }
        break
      default:
        super.notification(what)
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
            this.viewport2.width = this._renderCallViewport.width
            this.viewport2.height = this._renderCallViewport.height
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
            renderer.texture.bind({ value: null, location: 0 })
            renderer.texture.bind({ value: null, location: 1 })
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
            this.viewport.width = this._renderCallViewport.width
            this.viewport.height = this._renderCallViewport.height
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

import { Resouce } from '@rubickjs/shared'
import type { Timer } from './Timer'
import type { WebGLRenderer } from '@rubickjs/renderer'
import type { UIInputEvent } from '@rubickjs/input'
import type { Viewport } from './Viewport'
import type { SceneTree } from './SceneTree'

export class Node extends Resouce {
  /**
   * The owning scene tree of this node
   */
  tree?: SceneTree | null

  /**
   * The timeline of this node
   */
  get timeline(): Timer | undefined { return this.tree?.timeline }

  /**
   * The currently active viewport
   */
  get currentViewport(): Viewport | undefined { return this.tree?.activeViewport }

  /**
   * The root viewport of this node
   */
  get root(): Viewport | undefined { return this.tree?.root }

  /**
   * The parent node of this node
   */
  parentNode?: Node | null

  /**
   * The index of owner childNodes
   */
  get index(): number { return this.parentNode?.childNodes.indexOf(this) ?? -1 }
  get previousSibling(): Node | undefined { return this.parentNode?.childNodes[this.index - 1] }
  get nextSibling(): Node | undefined { return this.parentNode?.childNodes[this.index + 1] }

  /**
   * Node's childNodes
   */
  childNodes: Node[] = []

  /**
   * Whether to display in the scene
   */
  visible = true
  visibleTime = 0
  visibleDuration?: number
  get visibleRange(): [number, number] {
    return [
      this.visibleTime,
      this.visibleDuration
        ? this.visibleTime + this.visibleDuration
        : this.timeline?.endTime ?? 0,
    ]
  }

  isVisible(currentTime = this.timeline?.currentTime ?? 0): boolean {
    if (this.visible) {
      const [startTime, endTime] = this.visibleRange
      return startTime <= currentTime && currentTime <= endTime
    }
    return false
  }

  /**
   * Set the owning scene tree of this node
   *
   * @param tree
   */
  setTree(tree: SceneTree | undefined | null): this {
    this.tree = tree
    return this
  }

  /**
   * Hook for node enter scene tree
   */
  enterTree(): void {
    this.emit('enterTree')
  }

  /**
   * Hook for node ready
   */
  ready(): void {
    //
  }

  /**
   * Hook for input event
   */
  input(event: UIInputEvent): void {
    for (let i = this.childNodes.length - 1; i >= 0; i--) {
      this.childNodes[i].input(event)
    }

    this._input(event)
  }

  protected _input(_event: UIInputEvent): void {
    //
  }

  /**
   * Process node with childNodes status updates before rendering
   * @param delta
   */
  process(delta: number): void {
    for (let i = this.childNodes.length - 1; i >= 0; i--) {
      this.childNodes[i].process(delta)
    }

    this._process(delta)
  }

  /**
   * Process node status updates before rendering
   */
  protected _process(_delta: number): void {
    //
  }

  protected isRenderable(): boolean {
    return this.visible
  }

  /**
   * Render node with child nodes
   * @param renderer
   */
  render(renderer: WebGLRenderer): void {
    if (this.isRenderable()) {
      this._render(renderer)
      this._renderChildNodes(renderer)
    }
  }

  /**
   * Render node
   * @param _renderer
   * @protected
   */
  protected _render(_renderer: WebGLRenderer): void {
    //
  }

  /**
   * Render child nodes
   * @param renderer
   * @protected
   */
  protected _renderChildNodes(renderer: WebGLRenderer): void {
    for (let len = this.childNodes.length, i = 0; i < len; i++) {
      this.childNodes[i].render(renderer)
    }
  }

  /**
   * Hook for node exite scene tree
   */
  exitTree(): void {
    this.emit('exitTree')
  }

  /**
   * Adds a child node.
   * Nodes can have any number of childNodes, but every child must have a unique id.
   * Child nodes are automatically deleted when the parent node is deleted, so an entire scene can be removed by deleting its topmost node.
   */
  appendChild<T extends Node, D extends Node>(node: T, previousSibling?: D): boolean {
    if (node.parentNode) {
      return false
    }

    node.parentNode = this
    node.tree = this.tree

    if (previousSibling) {
      if (previousSibling.parentNode !== this) {
        return false
      }
      this.childNodes.splice(previousSibling.index + 1, 0, node)
    } else {
      this.childNodes.push(node)
    }

    if (node.tree) {
      node.enterTree()
      node.childNodes.forEach(child => {
        if (child.tree !== node.tree) {
          child.tree = node.tree
          child.enterTree()
        }
      })
    }

    return true
  }

  /**
   * Removes a child node.
   * The node is NOT deleted and must be deleted manually.
   *
   * @param node
   */
  removeChild<T extends Node>(node: T): boolean {
    const index = node.index

    if (node.parentNode !== this || index < 0) {
      return false
    }

    node.parentNode = null

    this.childNodes.splice(index, 1)

    if (node.tree) {
      node.tree = null
      node.exitTree()
      node.childNodes.forEach(child => {
        if (child.tree) {
          child.tree = null
          child.exitTree()
        }
      })
    }

    return true
  }
}

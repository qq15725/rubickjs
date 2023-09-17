import { clamp } from '@rubickjs/math'
import { Resource } from './Resource'
import type { RenderQueue } from './RenderQueue'
import type { SceneTree } from './SceneTree'
import type { WebGLRenderer } from '@rubickjs/renderer'
import type { UIInputEvent } from '@rubickjs/input'

export interface NodeProcessContext {
  elapsedTime: number
  currentTime: number
  renderQueue: RenderQueue
}

export class Node extends Resource {
  /** Scene tree */
  protected _tree?: SceneTree
  get tree() { return this._tree }
  set tree(val) {
    const oldVal = this._tree
    if (val === oldVal) return

    if (val) {
      this._tree = val
      this._enterTree(val)
      this.emit('enterTree', val)
    } else if (oldVal) {
      this.emit('exitTree', val)
      this._exitTree(oldVal)
      this._tree = val
    }

    for (let len = this.childNodes.length, i = 0; i < len; i++) {
      this.childNodes[i].tree = val
    }
  }

  /** Parent node */
  protected _parentNode?: Node
  get parentNode() { return this._parentNode }
  set parentNode(val) {
    if (val !== this._parentNode) {
      this._parentNode = val
    }
  }

  /** Child nodes */
  childNodes: Node[] = []
  get siblingIndex(): number { return this._parentNode?.childNodes.indexOf(this) ?? 0 }
  set siblingIndex(index) {
    if (!this._parentNode) {
      return
    }
    const siblings = this._parentNode.childNodes
    const oldIndex = siblings.indexOf(this)
    if (index !== oldIndex) {
      oldIndex > -1 && siblings.splice(oldIndex, 1)
      if (index > -1 && index < siblings.length) {
        siblings.splice(index, 0, this)
      } else {
        siblings.push(this)
      }
    }
  }

  get previousSibling(): Node | undefined { return this._parentNode?.childNodes[this.siblingIndex - 1] }
  get nextSibling(): Node | undefined { return this._parentNode?.childNodes[this.siblingIndex + 1] }
  get firstSibling(): Node | undefined { return this._parentNode?.childNodes[0] }
  get lastSibling(): Node | undefined { return this._parentNode?.childNodes[this._parentNode?.childNodes.length - 1] }

  /** Visibility */
  visible = true
  visibleStartTime = 0
  visibleDuration = Number.MAX_SAFE_INTEGER
  get visibleEndTime(): number { return this.visibleStartTime + this.visibleDuration }
  get visibleProgress(): number {
    return clamp(
      0,
      ((this._tree?.timeline.currentTime ?? 0) - this.visibleStartTime)
      / this.visibleDuration,
      1,
    )
  }

  hide(): void { this.visible = false }
  show(): void { this.visible = true }

  protected _globalVisible = this.visible
  isVisible(): boolean { return this._globalVisible }

  updateVisibility(currentTime: number) {
    let visible = this.visible
      && this.parentNode?.isVisible() !== false
    if (visible && this._tree) {
      visible = this.visibleStartTime <= currentTime
        && currentTime <= this.visibleEndTime
    }
    this._globalVisible = visible
  }

  /** Whether this node can be rendered */
  protected _renderable = false
  needsRender(): boolean { return this._renderable && this.isVisible() }

  /** Process node with child nodes status updates before rendering */
  process(context: NodeProcessContext): void {
    this.updateVisibility(context.currentTime)
    this._process(context)
    context.renderQueue.push(this, undefined, false)
    this._processChildNodes(context)
    context.renderQueue.pushEnd(this)
  }

  protected _processChildNodes(context: NodeProcessContext) {
    for (let len = this.childNodes.length, i = 0; i < len; i++) {
      this.childNodes[i].process(context)
    }
  }

  /**
   * Render node with child nodes
   * @param renderer
   */
  render(renderer: WebGLRenderer): void {
    this._render(renderer)
  }

  /**
   * Handle input event
   */
  input(event: UIInputEvent): void {
    for (let i = this.childNodes.length - 1; i >= 0; i--) {
      this.childNodes[i].input(event)
    }

    this._input(event)
  }

  getNode(selector: string): Node | undefined {
    return this.childNodes.find(child => child.name === selector)
  }

  /**
   * Adds a child node.
   * Nodes can have any number of childNodes, but every child must have a unique id.
   * Child nodes are automatically deleted when the parent node is deleted, so an entire scene can be removed by deleting its topmost node.
   */
  appendChild<T extends Node, D extends Node>(node: T, previousSibling?: D): boolean {
    if (
      node.parentNode
      || (previousSibling && previousSibling.parentNode !== this)
    ) {
      return false
    }
    node.parentNode = this
    node.siblingIndex = previousSibling
      ? (previousSibling.siblingIndex + 1)
      : this.childNodes.length
    node.tree = this.tree
    return true
  }

  /**
   * Removes a child node.
   * The node is NOT deleted and must be deleted manually.
   *
   * @param node
   */
  removeChild<T extends Node>(node: T): boolean {
    const siblingIndex = node.siblingIndex
    if (node.parentNode !== this || siblingIndex < 0) {
      return false
    }
    this.childNodes.splice(siblingIndex, 1)
    node.parentNode = undefined
    node.tree = undefined
    return true
  }

  /** Hooks */
  /** Hook for process node status */
  protected _process(_context: NodeProcessContext): void { /** override */ }
  /** Hook for input event */
  protected _input(_event: UIInputEvent): void { /** override */ }
  /** Hook for render node */
  protected _render(_renderer: WebGLRenderer): void { /** override */ }
  /** Hook for enter scene tree */
  protected _enterTree(_tree: SceneTree): void { /** override */ }
  /** Hook for exit scene tree */
  protected _exitTree(_tree: SceneTree): void { /** override */ }
}

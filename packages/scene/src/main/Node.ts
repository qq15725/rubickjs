import { Resouce } from './Resouce'
import type { UIInputEvent } from '@rubickjs/input'
import type { Timeline } from '../resources'
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
  get timeline(): Timeline | undefined { return this.tree?.timeline }
  get currentTime(): number { return this.timeline?.currentTime ?? 0 }
  get currentStartTime(): number { return this.timeline?.startTime ?? 0 }
  get currentEndTime(): number { return this.timeline?.endTime ?? 0 }

  /**
   * The currently active viewport
   */
  get currentViewport(): Viewport | undefined { return this.tree?.viewport }

  /**
   * The root viewport of this node
   */
  get root(): Viewport | undefined { return this.tree?.root }

  /**
   * The owning node of this node
   */
  owner?: Node | null

  /**
   * The index of owner children
   */
  get index(): number { return this.owner?.children.indexOf(this) ?? -1 }
  get previousSibling(): Node | undefined { return this.owner?.children[this.index - 1] }
  get nextSibling(): Node | undefined { return this.owner?.children[this.index + 1] }

  /**
   * Node's children
   */
  children: Node[] = []

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
        : this.currentEndTime,
    ]
  }

  isVisible(currentTime = this.currentTime): boolean {
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
  ready(): void {}

  /**
   * Hook for input event
   */
  input(event: UIInputEvent): void | boolean {
    const currentTime = this.currentTime
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i]
      if (child.isVisible(currentTime)) {
        child.input(event)
      }
    }
  }

  /**
   * Hook for per frame process
   */
  process(delta: number): void | boolean {
    const currentTime = this.currentTime
    for (let len = this.children.length, i = 0; i < len; i++) {
      const child = this.children[i]
      if (child.isVisible(currentTime)) {
        child.process(delta)
      }
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
   * Nodes can have any number of children, but every child must have a unique id.
   * Child nodes are automatically deleted when the parent node is deleted, so an entire scene can be removed by deleting its topmost node.
   */
  appendChild<T extends Node, D extends Node>(node: T, previousSibling?: D): boolean {
    if (node.owner) {
      return false
    }

    node.owner = this
    node.tree = this.tree

    if (previousSibling) {
      if (previousSibling.owner !== this) {
        return false
      }
      this.children.splice(previousSibling.index + 1, 0, node)
    } else {
      this.children.push(node)
    }

    if (node.tree) {
      node.enterTree()
      node.children.forEach(child => {
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

    if (node.owner !== this || index < 0) {
      return false
    }

    node.owner = null

    this.children.splice(index, 1)

    if (node.tree) {
      node.tree = null
      node.exitTree()
      node.children.forEach(child => {
        if (child.tree) {
          child.tree = null
          child.exitTree()
        }
      })
    }

    return true
  }
}

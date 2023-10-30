import { clamp } from '@rubickjs/math'
import { property } from './decorators'
import { ReactiveTarget } from './ReactiveTarget'
import type { SceneTree } from './SceneTree'
import type { Maskable, WebGLRenderer } from '@rubickjs/renderer'
import type { UIInputEvent } from '@rubickjs/input'

export enum InternalMode {
  DISABLED = 0,
  FRONT = 1,
  BACK = 2,
}

export type Visibility = 'visible' | 'hidden'

export interface NodeProperties {
  name?: string
  visibility?: Visibility
}

export class Node extends ReactiveTarget {
  readonly tagName!: string

  @property() name!: string
  @property() visibility?: Visibility
  @property() mask?: Maskable

  /** Visibility */
  visibleStartTime = 0
  visibleDuration = Number.MAX_SAFE_INTEGER

  /** @internal */
  _computedVisibility: Visibility = 'visible'

  /** @internal */
  _internalMode = InternalMode.DISABLED

  protected _readyed = false
  protected _tree: SceneTree | null = null
  protected _parent: Node | null = null
  protected _children: Array<Node> = []

  get visibleEndTime(): number { return this.visibleStartTime + this.visibleDuration }
  get visibleProgress(): number {
    return clamp(
      0,
      ((this._tree?.timeline.currentTime ?? 0) - this.visibleStartTime)
      / this.visibleDuration,
      1,
    )
  }

  get siblingIndex(): number { return this.getIndex() }
  set siblingIndex(toIndex) { this._parent?.moveChild(this, toIndex) }
  get previousSibling(): Node | undefined { return this._parent?.getChildren()[this.getIndex() - 1] }
  get nextSibling(): Node | undefined { return this._parent?.getChildren()[this.getIndex() + 1] }
  get firstSibling(): Node | undefined { return this._parent?.getChildren()[0] }
  get lastSibling(): Node | undefined {
    const children = this._parent?.getChildren()
    return children ? children[children.length - 1] : undefined
  }

  constructor(properties: NodeProperties = {}) {
    super()
    this.setProperties(properties)
  }

  /** Meta */
  protected _meta = new Map<string, unknown>()
  hasMeta(name: string): boolean { return this._meta.has(name) }
  getMeta(name: string, defaultVal = null): any { return this._meta.get(name) ?? defaultVal }
  setMeta(name: string, value: any): void { this._meta.set(name, value) }
  deleteMeta(name: string): void { this._meta.delete(name) }
  clearMeta() { this._meta.clear() }

  /** Name */
  setName(value: string): this { this.name = value; return this }

  /** Tree */
  getTree() { return this._tree }
  getViewport() { return this._tree?.getCurrentViewport() }
  getWindow() { return this._tree?.root }
  isInsideTree() { return Boolean(this._tree) }
  /** @internal */
  _setTree(tree: SceneTree | null): this {
    const oldTree = this._tree
    if (tree !== oldTree) {
      if (tree) {
        this._tree = tree
        this.notification('enterTree')
        this.emit('treeEntered')
      } else if (oldTree) {
        this.emit('treeExiting')
        this.notification('exitTree')
        this._tree = tree
        this.emit('treeExited')
      }

      for (let len = this._children.length, i = 0; i < len; i++) {
        const node = this._children[i]
        !tree && this.emit('childExitingTree', node)
        node._setTree(tree)
        tree && this.emit('childEnteredTree', node)
      }

      if (tree) {
        this.notification('postEnterTree')
        if (!this._readyed) {
          this._readyed = true
          this.notification('ready')
          this.emit('ready')
        }
      }
    }

    return this
  }

  /** Parent */
  getParent(): Node | null { return this._parent }
  /** @internal */
  _setParent(parent: Node | null): this {
    if (parent !== this._parent) {
      this._parent = parent
      if (parent) {
        this.notification('parented')
      } else {
        this.notification('unparented')
      }
    }
    return this
  }

  /** Children */
  getChildren(includeInternal = false): Array<Node> {
    if (includeInternal) {
      return this._children
    }
    return this._children.filter(child => child._internalMode === InternalMode.DISABLED)
  }

  getIndex(includeInternal = false) {
    return this._parent?.getChildren(includeInternal).indexOf(this) ?? 0
  }

  moveChild(childNode: Node, toIndex: number) {
    const children = this._children
    const oldIndex = children.indexOf(childNode)

    let minIndex = children.findIndex(child => {
      switch (childNode._internalMode) {
        case InternalMode.DISABLED:
          return child._internalMode !== InternalMode.FRONT
        case InternalMode.BACK:
          return child._internalMode === InternalMode.BACK
        case InternalMode.FRONT:
        default:
          return true
      }
    })
    minIndex = minIndex > -1 ? minIndex : children.length - 1

    let maxIndex = children.slice(minIndex).findIndex(child => {
      switch (childNode._internalMode) {
        case InternalMode.FRONT:
          return child._internalMode !== InternalMode.FRONT
        case InternalMode.DISABLED:
          return child._internalMode === InternalMode.BACK
        case InternalMode.BACK:
        default:
          return false
      }
    })
    maxIndex = maxIndex > -1 ? (minIndex + maxIndex) : children.length - 1

    const index = clamp(minIndex, toIndex > -1 ? toIndex : maxIndex, maxIndex)
    if (index !== oldIndex) {
      oldIndex > -1 && children.splice(oldIndex, 1)
      if (index > -1 && index < children.length) {
        children.splice(index, 0, childNode)
      } else {
        children.push(childNode)
      }
    }
  }

  isRenderable(): boolean {
    return (this.constructor as any).renderable && this.isVisible()
  }

  isVisible(): boolean {
    return this._computedVisibility !== 'hidden'
  }

  protected _computeVisibility() {
    let visibility = this.visibility
      ?? this._parent?._computedVisibility
      ?? 'visible'

    const currentTime = this._tree?.timeline.currentTime ?? 0
    if (
      visibility !== 'hidden'
      && (currentTime < this.visibleStartTime || currentTime > this.visibleEndTime)
    ) {
      visibility = 'hidden'
    }

    this._computedVisibility = visibility
  }

  override notification(what: string) {
    super.notification(what)
    switch (what) {
      case 'enterTree':
        this._enterTree()
        break
      case 'exitTree':
        this._exitTree()
        break
      case 'ready':
        this._ready()
        break
      case 'process': {
        this._computeVisibility()
        const tree = this._tree
        tree?.emit('nodeProcessing', this)
        this._process(tree?.deltaTime ?? 0)

        const isRenderable = this.isRenderable()
        let oldRenderCall
        if (tree && isRenderable) {
          const renderCall = tree.renderStack.push(this)
          oldRenderCall = tree.renderStack.currentCall
          tree.renderStack.currentCall = renderCall
        }

        if (this.mask instanceof Node) {
          this.mask._setTree(this._tree)
          this.mask.notification('process')
        }

        for (let len = this._children.length, i = 0; i < len; i++) {
          this._children[i].notification('process')
        }

        if (tree && isRenderable) {
          tree.renderStack.currentCall = oldRenderCall
        }
        tree?.emit('nodeProcessed', this)
        break
      }
      case 'postEnterTree':
      case 'parented':
      case 'unparented':
        break
    }
  }

  render(renderer: WebGLRenderer, next?: () => void): void {
    const mask = this.mask

    if (mask) {
      renderer.flush()
      renderer.mask.push(this, mask)
    }

    this._render(renderer)

    next?.()

    if (mask) {
      renderer.flush()
      renderer.mask.pop(this)
    }
  }

  input(event: UIInputEvent): void {
    for (let i = this._children.length - 1; i >= 0; i--) {
      this._children[i].input(event)
    }
    this._input(event)
  }

  getDeltaTime() {
    return this._tree?.deltaTime ?? 0
  }

  getNode(path: string): Node | undefined {
    return this._children.find(child => child.name === path)
  }

  addChild(node: Node, internal = InternalMode.DISABLED): this {
    if (this !== node && !node.getParent()) {
      const children = this.getChildren(true)
      switch (internal) {
        case InternalMode.DISABLED: {
          const index = children.findIndex(child => child._internalMode === InternalMode.BACK)
          if (index > -1) {
            children.splice(index, 0, node)
          } else {
            children.push(node)
          }
          break
        }
        case InternalMode.FRONT: {
          let index = children.findIndex(child => child._internalMode !== InternalMode.FRONT)
          index = index > -1 ? index + 1 : children.length - 1
          children.splice(index, 0, node)
          break
        }
        case InternalMode.BACK:
          children.push(node)
          break
      }
      node._internalMode = internal
      node._setParent(this)
      node._setTree(this._tree)
    }
    return this
  }

  addSibling(sibling: Node): this {
    if (this._parent && !sibling.getParent()) {
      this._parent._children.splice(
        this.getIndex(true) + 1,
        0,
        sibling,
      )
      sibling._internalMode = this._internalMode
      sibling._setParent(this._parent)
      sibling._setTree(this._parent._tree)
    }
    return this
  }

  removeChild<T extends Node>(node: T): this {
    const index = node.getIndex(true)
    if (node.getParent() === this && index > -1) {
      this._children.splice(index, 1)
      node._setParent(null)
      node._setTree(null)
    }
    return this
  }

  override toObject(): Record<string, any> {
    const object: any = {
      tag: this.tagName,
      ...super.toObject(),
    }

    if (this._children.length) {
      object.children = this._children.map(child => child.toObject())
    }

    return object
  }

  protected _enterTree(): void { /** override */ }
  protected _ready(): void { /** override */ }
  protected _exitTree(): void { /** override */ }
  protected _process(_delta: number): void { /** override */ }
  protected _input(_event: UIInputEvent): void { /** override */ }
  protected _render(_renderer: WebGLRenderer): void { /** override */ }
}

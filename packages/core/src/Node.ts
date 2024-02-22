import { clamp } from '@rubickjs/math'
import { customNode, property } from './decorators'
import { Reactive } from './Reactive'
import type { SceneTree } from './SceneTree'
import type { Maskable, WebGLRenderer } from '@rubickjs/renderer'

export enum InternalMode {
  DEFAULT = 0,
  FRONT = 1,
  BACK = 2,
}

export type Visibility = 'visible' | 'hidden'

export interface NodeOptions {
  name?: string
  mask?: Maskable
  visibility?: Visibility
  visibleStartTime?: number
  visibleDuration?: number
}

let UID = 0
@customNode('node')
export class Node extends Reactive {
  readonly instanceId = ++UID
  readonly declare tag: string
  renderable?: boolean

  // @ts-expect-error tag
  @property() name = `${ this.tag }:${ String(this.instanceId) }`
  @property() mask?: Maskable
  @property() visibility?: Visibility
  @property() visibleStartTime?: number
  @property() visibleDuration?: number

  /** @internal */
  _computedVisibility: Visibility = 'visible'

  /** @internal */
  _internalMode = InternalMode.DEFAULT

  protected _readyed = false
  protected _tree: SceneTree | null = null
  protected _parent: Node | null = null
  protected _children: Array<Node> = []

  get children(): Array<Node> { return this.getChildren() }

  get visibleTimeline(): Array<number> {
    const start = this.visibleStartTime ?? 0
    const duration = this.visibleDuration ?? Number.MAX_SAFE_INTEGER
    return [start, start + duration]
  }

  get visibleEndTime(): number { return this.visibleTimeline[1] }
  get visibleRelativeTime(): number { return (this._tree?.timeline.currentTime ?? 0) - this.visibleTimeline[0] }
  get visibleProgress(): number {
    const [start, end] = this.visibleTimeline
    return clamp(0, this.visibleRelativeTime / (end - start), 1)
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

  constructor(options?: NodeOptions) {
    super()
    options && this.setProperties(options)
  }

  /** Meta */
  protected _meta = new Map<string, unknown>()
  hasMeta(name: string): boolean { return this._meta.has(name) }
  getMeta<T = any>(name: string): T | undefined
  getMeta<T = any>(name: string, defaultVal: T): T
  getMeta(name: string, defaultVal?: any): any { return this._meta.get(name) ?? defaultVal }
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

  isRenderable(): boolean {
    return (
      this.renderable !== false
        && (this.constructor as any).renderable
    )
      && this.isVisible()
  }

  isVisible(): boolean {
    return this._computedVisibility !== 'hidden'
  }

  protected _computeVisibility() {
    let visibility = this.visibility
      ?? this._parent?._computedVisibility
      ?? 'visible'

    const currentTime = this._tree?.timeline.currentTime ?? 0
    if (visibility !== 'hidden') {
      const [start, end] = this.visibleTimeline
      if (currentTime < start || currentTime > end) {
        visibility = 'hidden'
      }
    }

    this._computedVisibility = visibility
  }

  notification(what: string) {
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
          if (!this.getNode('__$mask')) {
            this.mask.renderable = false
            this.addChild(this.mask, InternalMode.FRONT)
          }
        } else {
          const mask = this.getNode('__$mask')
          if (mask) {
            this.removeChild(mask)
          }
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

  input(event: UIEvent): void {
    for (let i = this._children.length - 1; i >= 0; i--) {
      this._children[i].input(event)
    }
    this._input(event)
  }

  getDeltaTime() {
    return this._tree?.deltaTime ?? 0
  }

  /** Parent */
  get parent() { return this._parent }
  getParent(): Node | null { return this._parent }
  /** @internal */
  _setParent(parent: Node | null): this {
    if (parent !== this._parent) {
      this._parent = parent
      this._setTree(parent?._tree ?? null)
      this.notification(parent ? 'parented' : 'unparented')
    }
    return this
  }

  /** Children */
  getChildren(includeInternal: boolean | InternalMode = false): Array<Node> {
    switch (includeInternal) {
      case true:
        return this._children
      case false:
        return this._children.filter(child => child._internalMode === InternalMode.DEFAULT)
      default:
        return this._children.filter(child => child._internalMode === includeInternal)
    }
  }

  getIndex(includeInternal: boolean | InternalMode = false) {
    return this._parent?.getChildren(includeInternal).indexOf(this) ?? 0
  }

  getNode(path: string): Node | undefined {
    return this._children.find(child => child.name === path)
  }

  addSibling(node: Node): this {
    if (this.is(node) || !this._parent || node.parent) {
      return this
    }
    node._internalMode = this._internalMode
    this._parent.moveChild(node, this.getIndex(true) + 1)
    return this
  }

  addChild(node: Node, internal = InternalMode.DEFAULT): this {
    if (this.is(node) || node.parent) {
      return this
    }
    const children = this.getChildren(true)
    switch (internal) {
      case InternalMode.DEFAULT: {
        const index = children.findIndex(child => child._internalMode === InternalMode.BACK)
        if (index > -1) {
          children.splice(index, 0, node)
        } else {
          children.push(node)
        }
        break
      }
      case InternalMode.FRONT: {
        const index = children.findIndex(child => child._internalMode !== InternalMode.FRONT)
        if (index > -1) {
          children.splice(index, 0, node)
        } else {
          children.push(node)
        }
        break
      }
      case InternalMode.BACK:
        children.push(node)
        break
    }
    node._internalMode = internal
    node._setParent(this)
    this.emit('addChild', node)
    return this
  }

  moveChild(node: Node, toIndex: number): this {
    if (this.is(node) || (node.parent && !this.is(node.parent))) {
      return this
    }
    const children = this._children
    const oldIndex = children.indexOf(node)

    let minIndex = children.findIndex(child => {
      switch (node._internalMode) {
        case InternalMode.DEFAULT:
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
      switch (node._internalMode) {
        case InternalMode.FRONT:
          return child._internalMode !== InternalMode.FRONT
        case InternalMode.DEFAULT:
          return child._internalMode === InternalMode.BACK
        case InternalMode.BACK:
        default:
          return false
      }
    })
    maxIndex = maxIndex > -1 ? (minIndex + maxIndex) : children.length - 1

    const newIndex = clamp(minIndex, toIndex > -1 ? toIndex : maxIndex, maxIndex)
    if (newIndex !== oldIndex) {
      if (oldIndex > -1) {
        children.splice(oldIndex, 1)
      }
      node._setParent(this)
      if (newIndex > -1 && newIndex < children.length) {
        children.splice(newIndex, 0, node)
      } else {
        children.push(node)
      }
      if (oldIndex > -1) {
        this.emit('moveChild', node, newIndex, oldIndex)
      } else {
        this.emit('addChild', node)
      }
    }
    return this
  }

  removeChild<T extends Node>(childNode: T): this {
    const index = childNode.getIndex(true)
    if (this.is(childNode.parent) && index > -1) {
      this._children.splice(index, 1)
      childNode._setParent(null)
      this.emit('removeChild', childNode, index)
    }
    return this
  }

  is(target: Node | undefined | null): boolean {
    return Boolean(target && this.instanceId === target.instanceId)
  }

  protected _enterTree(): void { /** override */ }
  protected _ready(): void { /** override */ }
  protected _exitTree(): void { /** override */ }
  protected _process(_delta: number): void { /** override */ }
  protected _input(_event: UIEvent): void { /** override */ }
  protected _render(_renderer: WebGLRenderer): void { /** override */ }

  override toJSON(): Record<string, any> {
    return {
      tag: this.tag,
      props: super.toJSON(),
      children: this.children.map(child => child.toJSON()),
    }
  }
}

import { EventEmitter } from '@rubickjs/shared'

let UID = 0
export class Resource extends EventEmitter {
  /** If resource has been destroyed */
  destroyed = false

  /**
   * Unique id
   */
  readonly id = ++UID

  /**
   * Custom name
   */
  name = `${ this.constructor.name }-${ this.id }`

  /**
   * The fields (dirty fields) is not uploaded
   */
  protected _dirty = new Map<string, number>()
  get isDirty(): boolean { return this._dirty.size > 0 }
  hasDirty(key: string): boolean { return this._dirty.has(key) }
  getDirtyId(key: string): number { return this._dirty.get(key) ?? -1 }
  addDirty(key: string) { this._dirty.set(key, this.getDirtyId(key) + 1) }
  deleteDirty(key: string) { this._dirty.delete(key) }
  clearDirty() { this._dirty.clear() }

  /**
   * Call when destroying resource
   */
  destroy(): void {
    if (!this.destroyed) {
      this.destroyed = true
      this.dispose()
    }
  }

  /** Clean up anything, this happens when destroying is ready. */
  dispose(): void { /** override */ }
}

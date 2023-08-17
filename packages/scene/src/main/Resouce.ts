import { EventEmitter, uid } from '@rubickjs/shared'
import { getCurrentRenderer } from '@rubickjs/renderer'

export class Resouce extends EventEmitter {
  /**
   * Unique id
   */
  readonly id = uid()

  /**
   * Custom name
   */
  name = this.id

  /**
   * Dirty fields
   */
  protected _dirty = new Set<string>()
  get isDirty(): boolean { return this._dirty.size > 0 }
  hasDirty(key: string): boolean { return this._dirty.has(key) }
  addDirty(key: string) { this._dirty.add(key) }
  deleteDirty(key: string) { this._dirty.delete(key) }
  clearDirty() { this._dirty.clear() }

  /**
   * Current renderer
   */
  get renderer() { return getCurrentRenderer() }
}

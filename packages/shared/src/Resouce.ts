import { EventEmitter } from './EventEmitter'

let UID = 0
export class Resouce extends EventEmitter {
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
  protected _dirty = new Set<string>()
  get isDirty(): boolean { return this._dirty.size > 0 }
  hasDirty(key: string): boolean { return this._dirty.has(key) }
  addDirty(key: string) { this._dirty.add(key) }
  deleteDirty(key: string) { this._dirty.delete(key) }
  clearDirty() { this._dirty.clear() }
}

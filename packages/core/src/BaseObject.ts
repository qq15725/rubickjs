import { EventEmitter } from '@rubickjs/shared'

export class BaseObject extends EventEmitter {
  __ENGINE_OBJECT__ = true

  static AUTO_INCREMENT_INSTANCE_ID = 0

  getClass(): string { return this.constructor.name }

  /** InstanceId */
  protected _instanceId = ++BaseObject.AUTO_INCREMENT_INSTANCE_ID
  getInstanceId() { return this._instanceId }

  /** Dirty */
  protected _dirty = new Map<string, number>()
  get isDirty(): boolean { return this._dirty.size > 0 }
  hasDirty(key: string): boolean { return this._dirty.has(key) }
  getDirtyId(key: string): number { return this._dirty.get(key) ?? -1 }
  addDirty(key: string) { this._dirty.set(key, this.getDirtyId(key) + 1) }
  deleteDirty(key: string) { this._dirty.delete(key) }
  clearDirty() { this._dirty.clear() }

  /** Notification */
  notification(_what: string) { /** override */ }

  /** Meta */
  protected _meta = new Map<string, any>()
  hasMeta(name: string): boolean { return this._meta.has(name) }
  getMeta(name: string, defaultVal = null): any { return this._meta.get(name) ?? defaultVal }
  setMeta(name: string, value: any): void { this._meta.set(name, value) }
  deleteMeta(name: string): void { this._meta.delete(name) }
  clearMeta() { this._meta.clear() }
}

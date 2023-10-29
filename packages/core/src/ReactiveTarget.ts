import { EventTarget } from './EventTarget'
import { nextTick } from './global'

/* @__INLINE__ */
const JSCompiler_renameProperty = <P extends PropertyKey>(
  prop: P,
  _obj: unknown,
): P => prop

export interface PropertyDeclaration {
  readonly proxiedKey?: string
  readonly state?: boolean
}

export type PropertyValues<T = any> = T extends object
  ? PropertyValueMap<T>
  : Map<PropertyKey, unknown>

export interface PropertyValueMap<T> extends Map<PropertyKey, unknown> {
  get<K extends keyof T>(k: K): T[K] | undefined
  set<K extends keyof T>(key: K, value: T[K]): this
  has<K extends keyof T>(k: K): boolean
  delete<K extends keyof T>(k: K): boolean
}

const {
  is,
  defineProperty,
  getOwnPropertyDescriptor,
  getPrototypeOf,
} = Object

export class ReactiveTarget extends EventTarget {
  protected static _finalized?: true
  static targetProperties = new Map<PropertyKey, PropertyDeclaration>()

  static createProperty(
    name: PropertyKey,
    options: PropertyDeclaration = {},
  ): void {
    this._prepare()
    this.targetProperties.set(name, options)
    const descriptor = this._getPropertyDescriptor(
      name,
      options?.proxiedKey ?? Symbol.for(String(name)),
    )
    if (descriptor !== undefined) {
      defineProperty(this.prototype, name, descriptor)
    }
  }

  protected static _getPropertyDescriptor(
    name: PropertyKey,
    key: string | symbol,
  ): PropertyDescriptor | undefined {
    const { get, set } = getOwnPropertyDescriptor(this.prototype, name) ?? {
      get(this: ReactiveTarget) { return (this as any)[key] },
      set(this: ReactiveTarget, v: unknown) { (this as any)[key] = v },
    }
    return {
      get(this: ReactiveTarget) { return get?.call(this) },
      set(this: ReactiveTarget, value: unknown) {
        const oldValue = get?.call(this)
        set!.call(this, value)
        this._requestUpdate(name, oldValue)
      },
      configurable: true,
      enumerable: true,
    }
  }

  private static _prepare() {
    // eslint-disable-next-line no-prototype-builtins
    if (this.hasOwnProperty(JSCompiler_renameProperty('targetProperties', this))) return
    const superCtor = getPrototypeOf(this) as typeof ReactiveTarget
    superCtor._finalize()
    this.targetProperties = new Map(superCtor.targetProperties)
  }

  protected static _finalize() {
    // eslint-disable-next-line no-prototype-builtins
    if (this.hasOwnProperty(JSCompiler_renameProperty('_finalized', this))) return
    this._finalized = true
    this._prepare()
  }

  protected _changedProperties: PropertyValues = new Map()
  protected _updatePromise = Promise.resolve()
  protected _isUpdatePending = false
  protected _isFirstUpdate = true

  isDirty(key: string): boolean {
    return this._changedProperties.has(key)
  }

  setProperties(properties: Record<string, any>) {
    const target = this.constructor as typeof ReactiveTarget
    for (const name in properties) {
      if (target.targetProperties.has(name)) {
        (this as any)[name] = properties[name]
      }
    }
  }

  protected _requestUpdate(key?: PropertyKey, oldValue?: unknown): void {
    if (key !== undefined) {
      const newValue = this[key as keyof this]
      if (!is(newValue, oldValue)) {
        this._changedProperties.set(key, oldValue)
        if (!this._isFirstUpdate) {
          this._onUpdateProperty(key, newValue, oldValue)
        }
      } else {
        return
      }
    }
    if (!this._isUpdatePending) {
      this._updatePromise = this._enqueueUpdate()
    }
  }

  protected async _enqueueUpdate() {
    this._isUpdatePending = true
    try {
      await this._updatePromise
    } catch (e) {
      Promise.reject(e)
    }
    await nextTick()
    this._performUpdate()
  }

  protected _performUpdate() {
    if (!this._isUpdatePending) return
    if (this._isFirstUpdate) {
      this._changedProperties.forEach((oldValue, key) => {
        this._onUpdateProperty(key, (this as any)[key], oldValue)
      })
    } else {
      this._isFirstUpdate = false
    }
    this._onUpdate(this._changedProperties)
    this._changedProperties = new Map()
    this._isUpdatePending = false
  }

  protected _onUpdate(_changed: PropertyValues): void { /** override */ }
  protected _onUpdateProperty(_key: PropertyKey, _value: any, _oldValue: any): void { /** override */ }

  toObject(): Record<string, unknown> {
    const properties = (this.constructor as typeof ReactiveTarget).targetProperties
    const obj: Record<string, unknown> = {}
    properties.forEach((property, key) => {
      if (typeof key === 'string' && !property.state && !property.proxiedKey) {
        obj[key] = (this as any)[key]
      }
    })
    return obj
  }

  toJSON(
    replacer?: (this: any, key: string, value: any) => any,
    space?: string | number,
  ): string {
    return JSON.stringify(this.toObject(), replacer, space)
  }
}

import { EventTarget } from './EventTarget'
import { nextTick } from './global'

/* @__INLINE__ */
const JSCompiler_renameProperty = <P extends PropertyKey>(
  prop: P,
  _obj: unknown,
): P => prop

export interface PropertyDeclaration {
  readonly default?: any
  readonly protected?: boolean
  readonly alias?: string
}

export class ReactiveTarget extends EventTarget {
  static _finalized?: true
  static propertyDeclarations = new Map<PropertyKey, PropertyDeclaration>()

  static defineProperty(name: PropertyKey, declaration: PropertyDeclaration = {}): void {
    this._prepare()
    this.propertyDeclarations.set(name, declaration)
    const {
      default: defaultValue,
      alias,
    } = declaration
    let descriptor = Object.getOwnPropertyDescriptor(this.prototype, name)
    if (!descriptor) {
      const key = alias ?? Symbol.for(String(name))
      descriptor = {
        get(this: ReactiveTarget) { return (this as any)[key] },
        set(this: ReactiveTarget, v: unknown) { (this as any)[key] = v },
      }
    }
    Object.defineProperty(this.prototype, name, {
      get(this: ReactiveTarget) { return descriptor!.get?.call(this) ?? defaultValue },
      set(this: ReactiveTarget, value: unknown) {
        const oldValue = descriptor!.get?.call(this) ?? defaultValue
        descriptor!.set?.call(this, value)
        this.requestUpdate(name, oldValue, declaration)
      },
      configurable: true,
      enumerable: true,
    })
  }

  private static _prepare() {
    // eslint-disable-next-line no-prototype-builtins
    if (!this.hasOwnProperty(JSCompiler_renameProperty('propertyDeclarations', this))) {
      const superCtor = Object.getPrototypeOf(this) as typeof ReactiveTarget
      // eslint-disable-next-line no-prototype-builtins
      if (!superCtor.hasOwnProperty(JSCompiler_renameProperty('_finalized', this))) {
        superCtor._finalized = true
        superCtor._prepare()
      }
      this.propertyDeclarations = new Map(superCtor.propertyDeclarations)
    }
  }

  protected _defaultProperties?: Record<PropertyKey, any>
  protected _changedProperties = new Map<PropertyKey, unknown>()
  protected _updatePromise = Promise.resolve()
  protected _isUpdatePending = false

  isDirty(key: string): boolean {
    return this._changedProperties.has(key)
  }

  getPropertyDeclarations(): Map<PropertyKey, PropertyDeclaration> {
    return (this.constructor as typeof ReactiveTarget).propertyDeclarations
  }

  getPropertyDeclaration(key: PropertyKey): PropertyDeclaration | undefined {
    return this.getPropertyDeclarations().get(key)
  }

  getDefaultProperties(): Record<PropertyKey, any> {
    if (!this._defaultProperties) {
      this._defaultProperties = {}
      for (const [name, property] of this.getPropertyDeclarations()) {
        if (!property.protected && !property.alias) {
          this._defaultProperties[name] = property.default
        }
      }
    }
    return this._defaultProperties
  }

  getProperty(key: PropertyKey): any | undefined {
    return (this as any)[key]
  }

  setProperty(key: PropertyKey, value: any): this {
    (this as any)[key] = value
    return this
  }

  getProperties(keys?: Array<PropertyKey>): Record<PropertyKey, any> {
    const properties: Record<PropertyKey, any> = {}
    for (const [name, property] of this.getPropertyDeclarations()) {
      if (!property.protected && !property.alias && (!keys || keys.includes(name))) {
        properties[name] = this.getProperty(name)
      }
    }
    return properties
  }

  setProperties(properties: Record<PropertyKey, any>): this {
    for (const [name] of this.getPropertyDeclarations()) {
      if (name in properties) {
        this.setProperty(name, properties[name])
      }
    }
    return this
  }

  requestUpdate(key?: PropertyKey, oldValue?: unknown, declaration?: PropertyDeclaration): void {
    if (key !== undefined) {
      const newValue = this[key as keyof this]
      if (!Object.is(newValue, oldValue)) {
        this._changedProperties.set(key, oldValue)
        this._onUpdateProperty(key, newValue, oldValue)
        this.emit('updateProperty', key, newValue, oldValue, declaration ?? this.getPropertyDeclaration(key))
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
    this._onUpdate(this._changedProperties)
    this._changedProperties = new Map()
    this._isUpdatePending = false
  }

  protected _onUpdate(_changed: Map<PropertyKey, unknown>): void { /** override */ }
  protected _onUpdateProperty(_key: PropertyKey, _value: any, _oldValue: any): void { /** override */ }
}

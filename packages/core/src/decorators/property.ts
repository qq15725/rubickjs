export interface PropertyDeclaration {
  readonly default?: any
  readonly protected?: boolean
  readonly alias?: string
  readonly get?: () => any
  readonly set?: (newValue: any) => any
}

const declarationMap = new WeakMap<object, Map<PropertyKey, PropertyDeclaration>>()

export function getDeclarations(constructor: Function): Map<PropertyKey, PropertyDeclaration> {
  let declarations = declarationMap.get(constructor)
  if (!declarations) {
    const superConstructor = Object.getPrototypeOf(constructor)
    declarations = new Map(superConstructor ? getDeclarations(superConstructor) : undefined)
    declarationMap.set(constructor, declarations)
  }
  return declarations
}

export function defineProperty(constructor: Function, name: PropertyKey, declaration: PropertyDeclaration = {}): void {
  getDeclarations(constructor).set(name, declaration)
  const {
    default: defaultValue,
    alias,
  } = declaration
  let descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, name)
  if (!descriptor) {
    const key = alias ?? Symbol.for(String(name))
    descriptor = {
      get(this: any) { return (this as any)[key] },
      set(this: any, v: unknown) { (this as any)[key] = v },
    }
  }
  Object.defineProperty(constructor.prototype, name, {
    get(this: any) { return descriptor!.get?.call(this) ?? defaultValue },
    set(this: any, value: unknown) {
      const oldValue = descriptor!.get?.call(this) ?? defaultValue
      descriptor!.set?.call(this, value)
      this.requestUpdate?.(name, oldValue, declaration)
    },
    configurable: true,
    enumerable: true,
  })
}

export function property(options?: PropertyDeclaration) {
  return function (proto: Object, name: PropertyKey) {
    defineProperty(proto.constructor, name, options)
  }
}

export function protectedProperty(options?: Omit<PropertyDeclaration, 'protected'>) {
  return property({ ...options, protected: true })
}

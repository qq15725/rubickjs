import type { PropertyDeclaration, ReactiveTarget } from '../ReactiveTarget'

export function property(options?: PropertyDeclaration) {
  return function (proto: Object, name: PropertyKey) {
    (proto.constructor as typeof ReactiveTarget).defineProperty(name, options)
  }
}

export function protectedProperty(options?: Omit<PropertyDeclaration, 'protected'>) {
  return property({ ...options, protected: true })
}

import type { PropertyDeclaration, ReactiveTarget } from '../ReactiveTarget'

export function property(options?: PropertyDeclaration) {
  return function (proto: Object, name: PropertyKey) {
    (proto.constructor as typeof ReactiveTarget).createProperty(name, options)
  }
}

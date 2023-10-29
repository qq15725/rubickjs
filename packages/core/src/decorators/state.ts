import { property } from './property'
import type { PropertyDeclaration } from '../ReactiveTarget'

export function state(options?: PropertyDeclaration) {
  return property({ ...options, state: true })
}

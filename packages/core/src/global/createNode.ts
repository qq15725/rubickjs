import { customNodes } from '../decorators'
import type { Node } from '../Node'

export function createNode<T extends Node>(tagName = 'node', options: Record<string, any> = {}): T {
  const Klass = customNodes.get(tagName) as any
  if (!Klass) {
    throw new Error(`Failed to createNode, tagName: ${ tagName }`)
  }
  return new Klass().setProperties(options)
}

export interface CustomNodeOptions {
  tagName: string
  renderable?: boolean
}

export const customNodes = new Map<string, Function>()

export function customNode(tagName: string): any
export function customNode(options: CustomNodeOptions): any
export function customNode(options: string | CustomNodeOptions): any {
  let tagName: string
  let renderable: boolean | undefined
  if (typeof options === 'string') {
    tagName = options
  } else {
    ({ tagName, renderable } = options)
  }

  return function (constructor: Function) {
    Object.defineProperty(constructor.prototype, 'tagName', {
      value: tagName,
      enumerable: true,
      configurable: true,
    })

    if (typeof renderable !== 'undefined') {
      Object.defineProperty(constructor, 'renderable', {
        value: renderable,
        enumerable: false,
        configurable: false,
      })
    }

    customNodes.set(tagName, constructor)
  }
}

export interface CustomNodeOptions {
  tagName: string
  renderable?: boolean
}

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

  return function (obj: any) {
    Object.defineProperty(obj.prototype, 'tagName', {
      value: tagName,
      enumerable: true,
      configurable: true,
    })

    if (typeof renderable !== 'undefined') {
      Object.defineProperty(obj, 'renderable', {
        value: renderable,
      })
    }
  }
}

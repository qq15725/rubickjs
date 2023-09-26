export interface DefineProxiedPropOptions {
  internalKey?: string
  defaultValue?: any
  transformIn?: (val: any) => any
  transformOut?: (val: any) => any
  on?: string
  enumerable?: boolean
  configurable?: boolean
}

export function defineProxiedProp(options: DefineProxiedPropOptions = {}) {
  return function (target: any, key: string) {
    const { internalKey = `_${ key }`, on, transformIn, transformOut, defaultValue } = options

    Object.defineProperty(target, key, {
      get() {
        let val = this[internalKey] ?? defaultValue
        if (transformOut) val = transformOut(val)
        return val
      },
      set(val: any) {
        const oldVal = this[key]
        if (transformIn) val = transformIn(val)
        if (val !== oldVal) {
          this[internalKey] = val
          if (on) this[on]?.(val, oldVal)
        }
      },
      enumerable: options.enumerable ?? false,
      configurable: options.configurable ?? true,
    })
  }
}

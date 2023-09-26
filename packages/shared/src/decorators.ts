export interface DefineProxiedPropOptions {
  internal?: string
  defaultValue?: any
  get?: (val: any) => any
  set?: (val: any) => any
  on?: string
  enumerable?: boolean
  configurable?: boolean
}

export function defineProxiedProp(options: DefineProxiedPropOptions = {}) {
  return function (target: any, key: string) {
    const { internal = `_${ key }`, on, get, set, defaultValue } = options

    Object.defineProperty(target, key, {
      get() {
        let val = this[internal] ?? defaultValue
        if (get) val = get(val)
        return val
      },
      set(val: any) {
        const oldVal = this[key]
        if (set) val = set(val)
        if (val !== oldVal) {
          this[internal] = val
          if (on) this[on]?.(val, oldVal)
        }
      },
      enumerable: options.enumerable ?? false,
      configurable: options.configurable ?? true,
    })
  }
}

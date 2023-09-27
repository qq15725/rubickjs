interface PropDefinition {
  [key: string]: any
  internal?: string
  default?: any
  transformIn?: (val: any) => any
  transformOut?: (val: any) => any
  onUpdated?: string
  enumerable?: boolean
  configurable?: boolean
}

export function defineProps(props: Record<string, PropDefinition>) {
  return function (Klass: any) {
    for (const key in props) {
      const prop = props[key]

      const {
        internal = `_${ key }`,
        onUpdated,
        transformIn,
        transformOut,
        default: defaultValue,
      } = prop

      Object.defineProperty(Klass.prototype, key, {
        get() {
          let val = this[internal] ?? defaultValue
          if (transformIn) val = transformIn(val)
          return val
        },
        set(val: any) {
          const oldVal = this[key]
          if (transformOut) val = transformOut(val)
          if (val !== oldVal) {
            this[internal] = val
            if (onUpdated) this[onUpdated]?.(val, oldVal)
          }
        },
        enumerable: prop.enumerable ?? false,
        configurable: prop.configurable ?? true,
      })
    }

    Object.defineProperty(Klass, '_props', {
      value: props,
      enumerable: false,
      configurable: true,
    })
  }
}

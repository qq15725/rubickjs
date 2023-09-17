export const isPromise = <T>(val: object): val is Promise<T> => val && typeof (val as any).then === 'function'

let UID = 0
export function uid(object?: Record<string, any>) {
  return object?.__SPECTOR_Object_TAG?.id ?? ++UID
}

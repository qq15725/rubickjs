export const isPromise = <T>(val: object): val is Promise<T> => val && typeof (val as any).then === 'function'

let UID = 0
export function uid(object?: Record<string, any>) {
  return object?.__SPECTOR_Object_TAG?.id ?? ++UID
}

/**
 * Set meta data for debug
 *
 * @param object
 * @param data
 */
export function setMetadata(object: Record<string, any>, data: Record<string, any>) {
  // https://github.com/BabylonJS/Spector.js/#custom-data
  object.__SPECTOR_Metadata = data
}

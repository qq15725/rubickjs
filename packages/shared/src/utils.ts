import { IN_BROWSER, SUPPORTS_WEBGL2 } from './constants'

export const isPromise = <T>(val: object): val is Promise<T> => val && typeof (val as any).then === 'function'
export const isCanvasElement = (node: unknown): node is HTMLCanvasElement =>
  typeof node === 'object'
  && node !== null
  && (node as any).nodeType === 1
  && (node as any).tagName === 'CANVAS'
export const isWebgl2 = (gl: unknown): gl is WebGL2RenderingContext => SUPPORTS_WEBGL2
  && gl instanceof globalThis.WebGL2RenderingContext

let UID = 0
export function uid(object?: Record<string, any>) {
  return object?.__SPECTOR_Object_TAG?.id ?? ++UID
}

export function createHTMLCanvas(): HTMLCanvasElement | undefined {
  if (IN_BROWSER) {
    return globalThis.document.createElement('canvas')
  }
  return undefined
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

export const IN_BROWSER = typeof window !== 'undefined'
export const SUPPORTS_WEBGL2 = 'WebGL2RenderingContext' in globalThis
export const SUPPORTS_RESIZE_OBSERVER = 'ResizeObserver' in globalThis
export const SUPPORTS_POINTER_EVENTS = !!globalThis.PointerEvent
export const SUPPORTS_WHEEL_EVENTS = !!globalThis.WheelEvent
export const SUPPORTS_MOUSE_EVENTS = !!globalThis.MouseEvent
export const SUPPORTS_TOUCH_EVENTS = 'ontouchstart' in globalThis
export const DEVICE_PIXEL_RATIO = globalThis.devicePixelRatio || 1

export const isElementNode = (node: unknown): node is Element => node !== null && typeof node === 'object' && (node as any).nodeType === 1 // Node.ELEMENT_NODE
export const isVideoElement = (node: unknown): node is HTMLVideoElement => isElementNode(node) && node.tagName === 'VIDEO'
export const isImageElement = (node: unknown): node is HTMLImageElement => isElementNode(node) && node.tagName === 'IMG'
export const isCanvasElement = (node: unknown): node is HTMLCanvasElement =>
  typeof node === 'object'
  && node !== null
  && (node as any).nodeType === 1
  && (node as any).tagName === 'CANVAS'
export const isWebgl2 = (gl: unknown): gl is WebGL2RenderingContext => SUPPORTS_WEBGL2
  && gl instanceof globalThis.WebGL2RenderingContext
export function createHTMLCanvas(): HTMLCanvasElement | undefined {
  if (IN_BROWSER) {
    return globalThis.document.createElement('canvas')
  }
  return undefined
}

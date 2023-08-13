// DOM
export const IN_BROWSER = typeof window !== 'undefined'
export const SUPPORTS_WEBGL2 = 'WebGL2RenderingContext' in globalThis
export const SUPPORTS_RESIZE_OBSERVER = 'ResizeObserver' in globalThis
export const SUPPORTS_POINTER_EVENTS = !!globalThis.PointerEvent
export const SUPPORTS_WHEEL_EVENTS = !!globalThis.WheelEvent
export const SUPPORTS_MOUSE_EVENTS = !!globalThis.MouseEvent
export const SUPPORTS_TOUCH_EVENTS = 'ontouchstart' in globalThis
export const DEVICE_PIXEL_RATIO = globalThis.devicePixelRatio || 1

// Math
export const PI = Math.PI
export const PI_2 = PI * 2
export const DEG_TO_RAD = PI / 180
export const RAD_TO_DEG = 180 / PI

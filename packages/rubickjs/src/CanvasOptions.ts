import type { Timeline } from '@rubickjs/scene'
import type { ColorValue } from '@rubickjs/color'

export interface CanvasOptions extends WebGLContextAttributes {
  view?: HTMLCanvasElement | null
  width?: number
  height?: number
  pixelRatio?: number
  gl?: WebGLRenderingContext | WebGL2RenderingContext
  timeline?: Timeline
  background?: ColorValue
}

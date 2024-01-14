import type { Timer } from '@rubickjs/core'
import type { ColorValue } from '@rubickjs/color'

export interface EngineOptions extends WebGLContextAttributes {
  view?: HTMLCanvasElement
  width?: number
  height?: number
  pixelRatio?: number
  gl?: WebGLRenderingContext | WebGL2RenderingContext
  timeline?: Timer
  data?: any
  background?: ColorValue
}

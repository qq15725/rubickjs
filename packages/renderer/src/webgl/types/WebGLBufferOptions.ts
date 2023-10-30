import type { WebGLBufferTarget } from './WebGLBufferTarget'
import type { WebGLBufferUsage } from './WebGLBufferUsage'

export interface WebGLBufferOptions {
  target?: WebGLBufferTarget
  usage?: WebGLBufferUsage
  data: BufferSource | Array<number> | null
}

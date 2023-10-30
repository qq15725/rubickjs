import type { WebGLBufferTarget } from './WebGLBufferTarget'
import type { WebGLBufferUsage } from './WebGLBufferUsage'

export interface WebGLBufferMeta {
  id: number
  target?: WebGLBufferTarget
  usage?: WebGLBufferUsage
  length: number
  byteLength: number
  bytesPerElement: number
}

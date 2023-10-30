import type { WebGLVertexAttrib } from './WebGLVertexAttrib'

export interface WebGLVertexArrayObjectOptions {
  attributes?: Record<string, WebGLBuffer | WebGLVertexAttrib>
  elementArrayBuffer?: WebGLBuffer | null
}

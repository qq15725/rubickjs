import type { WebGLVertexAttrib } from './WebGLVertexAttrib'

export interface WebGLVertexArrayObjectOptions {
  /**
   * Vertex attributes
   */
  attributes?: Record<string, WebGLBuffer | WebGLVertexAttrib>

  /**
   * Index buffer
   */
  elementArrayBuffer?: WebGLBuffer | null
}

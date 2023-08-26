import type { WebGLVertexAttrib } from './WebGLVertexAttrib'

export interface WebGLVertexArrayObjectMetadata {
  /**
   * Vertex attributes
   */
  attributes: Record<string, WebGLVertexAttrib>

  /**
   * Index buffer
   */
  elementArrayBuffer: WebGLBuffer | null
}

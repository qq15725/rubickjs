import type { WebGLVertexAttrib } from './WebGLVertexAttrib'

export interface WebGLVertexArrayObjectMeta {
  attributes: Record<string, WebGLVertexAttrib>
  elementArrayBuffer: WebGLBuffer | null
}

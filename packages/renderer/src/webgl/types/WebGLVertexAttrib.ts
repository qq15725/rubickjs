export type WebGLVertexAttribType =
  | 'float'
  | 'unsigned_byte'
  | 'unsigned_short'

export interface WebGLVertexAttrib {
  buffer: WebGLBuffer
  enable?: boolean
  size?: number
  type?: WebGLVertexAttribType
  normalized?: boolean
  stride?: number
  offset?: number
  divisor?: number
}

export interface WebGLFramebufferOptions {
  width: number
  height: number
  mipLevel?: number
  stencil?: boolean
  depth?: boolean
  depthTexture?: WebGLTexture | null
  colorTextures?: WebGLTexture[]
}

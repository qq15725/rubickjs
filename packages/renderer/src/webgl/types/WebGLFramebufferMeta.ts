import type { WebGLFramebufferOptions } from './WebGLFramebufferOptions'

export interface WebGLFramebufferMeta extends Required<WebGLFramebufferOptions> {
  multisample: number
  stencilBuffer?: WebGLBuffer | null
  msaaBuffer?: WebGLBuffer | null
}

import type { WebGLTextureSource } from './WebGLTextureSource'
import type { WebGLTextureTarget } from './WebGLTextureTarget'
import type { WebGLTextureLocation } from './WebGLTextureLocation'
import type { WebGLTextureFilterMode } from './WebGLTextureFilterMode'
import type { WebGLTextureWrapMode } from './WebGLTextureWrapMode'

export interface WebGLTextureOptions {
  value: WebGLTextureSource
  target?: WebGLTextureTarget
  location?: WebGLTextureLocation
  filterMode?: WebGLTextureFilterMode
  wrapMode?: WebGLTextureWrapMode
  anisoLevel?: number
}

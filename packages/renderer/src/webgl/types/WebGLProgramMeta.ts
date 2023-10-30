import type { WebGLTarget } from './WebGLTarget'

export interface WebGLProgramMeta {
  attributes: Map<string, {
    type: WebGLTarget
    size: number
    name: string
    location: number
  }>
  uniforms: Map<string, {
    index: number
    type: WebGLTarget
    size: number
    isArray: boolean
    name: string
    location: WebGLUniformLocation | null
  }>
  boundUniforms: WeakMap<object, any>
}

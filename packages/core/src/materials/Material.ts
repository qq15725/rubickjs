import { Resource } from '../Resource'
import type { WebGLRenderer } from '@rubickjs/renderer'

export class Material extends Resource {
  static instance = new this()

  /**
   * Vertex shader source
   */
  vert = `precision highp float;
attribute vec2 position;
uniform mat3 projectionMatrix;
uniform mat3 modelViewMatrix;
void main(void) {
  gl_Position = vec4((projectionMatrix * modelViewMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
}`

  /**
   * Fragment shader source
   */
  frag = `uniform vec4 tint;
void main(void) {
  gl_FragColor = tint;
}`

  /**
   * Shader uniforms
   */
  readonly uniforms = new Map<string, any>([
    ['projectionMatrix', new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])],
    ['modelViewMatrix', new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])],
    ['tint', new Float32Array([1, 1, 1, 1])],
  ])

  constructor(propsData?: Partial<Material>) {
    super()

    this.vert = propsData?.vert ?? this.vert
    this.frag = propsData?.frag ?? this.frag
  }

  glProgram(renderer: WebGLRenderer): WebGLProgram {
    return renderer.getRelated(this, () => {
      let vert = this.vert
      let frag = this.frag
      if (!frag.includes('precision')) frag = `precision mediump float;\n${ frag }`
      if (!vert.includes('precision')) vert = `precision mediump float;\n${ vert }`
      return renderer.createProgram({ vert, frag })
    })
  }

  activate(renderer: WebGLRenderer, uniforms?: Record<string, any>): void {
    renderer.activeProgram(this.glProgram(renderer))

    if (uniforms || this.uniforms.size > 0) {
      renderer.updateUniforms({
        ...Object.fromEntries(this.uniforms.entries()),
        ...uniforms,
      })
    }
  }
}

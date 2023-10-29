import { UvMaterial } from '../materials'
import { VertexAttribute } from './VertexAttribute'
import { VertexBuffer } from './VertexBuffer'
import { IndexBuffer } from './IndexBuffer'
import { Geometry } from './Geometry'
import type { WebGLRenderer } from '@rubickjs/renderer'
import type { Material } from '../materials'

export class QuadUvGeometry extends Geometry {
  protected static _instance: QuadUvGeometry
  static get instance() {
    if (!this._instance) this._instance = new this()
    return this._instance
  }

  static draw(
    renderer: WebGLRenderer,
    material: Material = UvMaterial.instance,
    uniforms?: Record<string, any>,
  ): void {
    this.instance.draw(renderer, material, uniforms)
  }

  constructor() {
    super({
      vertexAttributes: {
        position: new VertexAttribute({
          buffer: new VertexBuffer({
            data: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
            dynamic: false,
          }),
          size: 2,
          normalized: false,
          type: 'float',
        }),
        uv: new VertexAttribute({
          buffer: new VertexBuffer({
            data: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
            dynamic: false,
          }),
          size: 2,
          normalized: false,
          type: 'float',
        }),
      },
      indexBuffer: new IndexBuffer({
        data: new Uint16Array([0, 1, 2, 0, 2, 3]),
        dynamic: false,
      }),
    })
  }
}

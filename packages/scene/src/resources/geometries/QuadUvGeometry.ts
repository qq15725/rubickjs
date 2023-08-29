import { Attribute } from '../Attribute'
import { AttributeBuffer } from '../AttributeBuffer'
import { IndexBuffer } from '../IndexBuffer'
import { Geometry } from '../Geometry'
import { UvMaterial } from '../materials/UvMaterial'
import type { WebGLRenderer } from '@rubickjs/renderer'
import type { Material } from '../Material'

export class QuadUvGeometry extends Geometry {
  /**
   * Global instance
   */
  static instance = new this()

  /**
   * Draw
   *
   * @param renderer
   * @param material
   * @param uniforms
   */
  static draw(
    renderer: WebGLRenderer,
    material: Material = UvMaterial.instance,
    uniforms?: Record<string, any>,
  ): void {
    this.instance.draw(renderer, material, uniforms)
  }

  constructor() {
    super({
      indexBuffer: new IndexBuffer({
        data: new Uint16Array([0, 1, 2, 0, 2, 3]),
        dynamic: false,
      }),
    })

    this.attributes.set('position', new Attribute({
      buffer: new AttributeBuffer({
        data: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
        dynamic: false,
      }),
      size: 2,
      normalized: false,
      type: 'float',
    }))

    this.attributes.set('uv', new Attribute({
      buffer: new AttributeBuffer({
        data: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        dynamic: false,
      }),
      size: 2,
      normalized: false,
      type: 'float',
    }))
  }
}

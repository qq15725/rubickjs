import { Attribute } from './Attribute'
import { AttributeBuffer } from './AttributeBuffer'
import { IndexBuffer } from './IndexBuffer'
import { Geometry } from './Geometry'

export class QuadGeometry extends Geometry {
  /**
   * Global instance
   */
  static instance = new this()

  constructor() {
    super({
      indexBuffer: new IndexBuffer({
        data: new Uint16Array([0, 1, 3, 2]),
        dynamic: false,
      }),
      mode: 'triangle_strip',
    })

    this.attributes.set('position', new Attribute({
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

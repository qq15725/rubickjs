import { Attribute } from './Attribute'
import { AttributeBuffer } from './AttributeBuffer'
import { IndexBuffer } from './IndexBuffer'
import { Geometry } from './Geometry'

export class UvGeometry extends Geometry {
  positionBuffer = new AttributeBuffer({
    data: new Float32Array(),
    dynamic: true,
  })

  uvBuffer = new AttributeBuffer({
    data: new Float32Array(),
    dynamic: true,
  })

  constructor() {
    super({
      indexBuffer: new IndexBuffer({
        data: new Uint16Array(),
        dynamic: true,
      }),
    })

    this.attributes.set('position', new Attribute({
      buffer: this.positionBuffer,
      size: 2,
      normalized: false,
      type: 'float',
    }))

    this.attributes.set('uv', new Attribute({
      buffer: this.uvBuffer,
      size: 2,
      normalized: false,
      type: 'float',
    }))
  }

  update(vertices: Float32Array, uvs: Float32Array, indices: Uint16Array): this {
    this.positionBuffer.data = vertices
    this.uvBuffer.data = uvs
    this.indexBuffer!.data = indices
    this.addDirty('buffers')
    return this
  }
}

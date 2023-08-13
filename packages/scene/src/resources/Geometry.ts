import { Resouce } from '../main/Resouce'
import type { Attribute } from './Attribute'
import type { IndexBuffer } from './IndexBuffer'
import type { Material } from './Material'
import type { AttributeBuffer } from './AttributeBuffer'
import type { WebGLDrawMode } from '@rubickjs/renderer'

export class Geometry extends Resouce {
  /**
   * Vertex attributes
   */
  readonly attributes: Map<string, Attribute>

  /**
   * Index buffer
   */
  indexBuffer?: IndexBuffer

  /**
   * Instance count
   *
   * @see instancedArrays
   */
  instanceCount?: number

  /**
   * Draw mode
   */
  mode: WebGLDrawMode

  protected materials = new WeakMap<Material, Record<string, any>>()

  constructor(propsData?: Partial<Geometry>) {
    super()

    this.attributes = propsData?.attributes ?? new Map()
    this.indexBuffer = propsData?.indexBuffer
    this.instanceCount = propsData?.instanceCount
    this.mode = propsData?.mode ?? 'triangles'
  }

  getVertexArray() {
    return {
      attributes: Object.fromEntries(
        Array.from(this.attributes).map(([key, attrib]) => {
          return [key, {
            buffer: attrib.buffer.getRelated(),
            size: attrib.size,
            type: attrib.type,
            normalized: attrib.normalized,
            stride: attrib.stride,
            offset: attrib.offset,
            divisor: attrib.divisor,
          }]
        }),
      ),
      elementArrayBuffer: this.indexBuffer?.getRelated(),
    }
  }

  getRelated(material: Material): WebGLVertexArrayObject | null {
    const renderer = this.renderer
    let flag = this.materials.get(material)
    if (!flag) {
      this.materials.set(material, flag = { material: material.uid, geometry: this.uid })
    }
    return renderer.getRelated(flag, () => {
      return renderer.createVertexArray(material.getRelated(), this.getVertexArray())
    })
  }

  draw(material: Material, uniforms?: Record<string, any>): void {
    const renderer = this.renderer
    renderer.flush()
    material.activate(uniforms)
    const vertexArrayObject = this.getRelated(material)
    renderer.activeVertexArray(vertexArrayObject ?? this.getVertexArray())

    if (this.dirty.has('buffers')) {
      this.dirty.delete('buffers')
      let buffer: AttributeBuffer | undefined
      this.attributes.forEach(attribute => {
        if (buffer?.uid !== attribute.buffer.uid) {
          buffer = attribute.buffer
          buffer.update()
        }
      })
      this.indexBuffer?.update()
    }

    if (this.dirty.has('vertexArray')) {
      this.dirty.delete('vertexArray')
      if (vertexArrayObject) {
        renderer.updateVertexArray(
          material.getRelated()!,
          vertexArrayObject,
          this.getVertexArray(),
        )
      }
    }

    renderer.draw({
      mode: this.mode,
      instanceCount: this.instanceCount,
    })
  }
}

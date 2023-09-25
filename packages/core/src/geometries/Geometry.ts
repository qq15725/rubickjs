import { Resource } from '../Resource'
import type { WebGLDrawMode, WebGLRenderer } from '@rubickjs/renderer'
import type { Attribute } from './Attribute'
import type { IndexBuffer } from './IndexBuffer'
import type { Material } from '../materials/Material'
import type { AttributeBuffer } from './AttributeBuffer'

export class Geometry extends Resource {
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

  glVertexArray(renderer: WebGLRenderer) {
    return {
      attributes: Object.fromEntries(
        Array.from(this.attributes).map(([key, attrib]) => {
          return [key, {
            buffer: attrib.buffer.glBuffer(renderer),
            size: attrib.size,
            type: attrib.type,
            normalized: attrib.normalized,
            stride: attrib.stride,
            offset: attrib.offset,
            divisor: attrib.divisor,
          }]
        }),
      ),
      elementArrayBuffer: this.indexBuffer?.glBuffer(renderer),
    }
  }

  protected glVertexArrayObject(renderer: WebGLRenderer, material: Material): WebGLVertexArrayObject | null {
    let flag = this.materials.get(material)
    if (!flag) {
      this.materials.set(material, flag = { material: material.getInstanceId(), geometry: this.getInstanceId() })
    }
    return renderer.getRelated(flag, () => {
      return renderer.createVertexArray(
        material.glProgram(renderer),
        this.glVertexArray(renderer),
      )
    })
  }

  draw(renderer: WebGLRenderer, material: Material, uniforms?: Record<string, any>): void {
    renderer.flush()
    material.activate(renderer, uniforms)
    const vao = this.glVertexArrayObject(renderer, material)
    renderer.activeVertexArray(vao ?? this.glVertexArray(renderer))

    if (this.hasDirty('buffers')) {
      this.deleteDirty('buffers')
      let buffer: AttributeBuffer | undefined
      this.attributes.forEach(attribute => {
        if (buffer?.getInstanceId() !== attribute.buffer.getInstanceId()) {
          buffer = attribute.buffer
          buffer.upload(renderer)
        }
      })
      this.indexBuffer?.upload(renderer)
    }

    if (this.hasDirty('vertexArray')) {
      this.deleteDirty('vertexArray')
      if (vao) {
        renderer.updateVertexArray(
          material.glProgram(renderer)!,
          vao,
          this.glVertexArray(renderer),
        )
      }
    }

    renderer.draw({
      mode: this.mode,
      instanceCount: this.instanceCount,
    })
  }
}

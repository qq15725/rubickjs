import { Resouce } from '@rubickjs/shared'
import type { WebGLRenderer } from '@rubickjs/renderer'

export class IndexBuffer extends Resouce {
  data: Uint16Array | null
  dynamic: boolean

  constructor(props?: Partial<IndexBuffer>) {
    super()

    this.data = props?.data ?? null
    this.dynamic = props?.dynamic ?? false
  }

  static from(data?: number[] | null, dynamic?: boolean) {
    return new this({
      data: data ? new Uint16Array(data) : data,
      dynamic,
    })
  }

  glBufferProps() {
    return {
      target: 'element_array_buffer',
      data: this.data,
      usage: this.dynamic ? 'dynamic_draw' : 'static_draw',
    } as const
  }

  glBuffer(renderer: WebGLRenderer): WebGLBuffer {
    return renderer.getRelated(this, () => {
      return renderer.createBuffer(this.glBufferProps())
    })
  }

  upload(renderer: WebGLRenderer) {
    renderer.updateBuffer(
      this.glBuffer(renderer),
      this.glBufferProps(),
    )
  }
}

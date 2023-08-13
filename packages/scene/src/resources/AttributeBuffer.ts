import { Resouce } from '../main/Resouce'

export class AttributeBuffer extends Resouce {
  /**
   * vertices data
   */
  data: BufferSource | null

  dynamic: boolean

  constructor(props?: Partial<AttributeBuffer>) {
    super()

    this.data = props?.data ?? null
    this.dynamic = props?.dynamic ?? false
  }

  static from(data?: number[] | null, dynamic?: boolean) {
    return new this({
      data: data ? new Float32Array(data) : data,
      dynamic,
    })
  }

  getBufferProps() {
    return {
      target: 'array_buffer',
      data: this.data,
      usage: this.dynamic ? 'dynamic_draw' : 'static_draw',
    } as const
  }

  getRelated() {
    const renderer = this.renderer
    return renderer.getRelated(this, () => {
      return renderer.createBuffer(this.getBufferProps())
    })
  }

  update() {
    this.renderer.updateBuffer(this.getRelated(), this.getBufferProps())
  }
}

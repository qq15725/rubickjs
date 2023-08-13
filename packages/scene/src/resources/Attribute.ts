import { Resouce } from '../main/Resouce'
import { AttributeBuffer } from './AttributeBuffer'

export class Attribute extends Resouce {
  /**
   * Vertex attrib buffer
   */
  buffer: AttributeBuffer

  // @see vertexAttribPointer
  size: number
  normalized: boolean
  type: 'float' | 'unsigned_byte' | 'unsigned_short'
  stride?: number
  offset?: number

  // @see vertexAttribDivisor
  divisor?: number

  constructor(props?: Partial<Attribute>) {
    super()

    this.buffer = props?.buffer ?? new AttributeBuffer()
    this.size = props?.size ?? 0
    this.normalized = props?.normalized ?? false
    this.type = props?.type ?? 'float'
    this.stride = props?.stride
    this.offset = props?.offset
    this.divisor = props?.divisor
  }

  static from(data?: number[] | null, size?: number, dynamic?: boolean) {
    return new this({
      size,
      buffer: new AttributeBuffer({
        data: data ? new Float32Array(data) : data,
        dynamic,
      }),
    })
  }
}

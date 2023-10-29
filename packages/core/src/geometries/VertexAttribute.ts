import { Resource } from '../Resource'
import { property } from '../decorators'
import { VertexBuffer } from './VertexBuffer'

export interface VertexAttributeOptions {
  buffer?: VertexBuffer
  size?: number
  normalized?: boolean
  type?: 'float' | 'unsigned_byte' | 'unsigned_short'
  stride?: number
  offset?: number
  divisor?: number
}

export class VertexAttribute extends Resource {
  @property() buffer: VertexBuffer
  @property() size: number
  @property() normalized: boolean
  @property() type: 'float' | 'unsigned_byte' | 'unsigned_short'
  @property() stride?: number
  @property() offset?: number
  @property() divisor?: number

  needsUpload = false

  constructor(options: VertexAttributeOptions = {}) {
    super()

    this.buffer = options.buffer ?? new VertexBuffer()
    this.size = options.size ?? 0
    this.normalized = options.normalized ?? false
    this.type = options.type ?? 'float'
    this.stride = options.stride
    this.offset = options.offset
    this.divisor = options.divisor
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'buffer':
      case 'size':
      case 'normalized':
      case 'type':
      case 'stride':
      case 'offset':
      case 'divisor':
        this.needsUpload = true
        break
    }
  }

  upload(): boolean {
    const result = this.needsUpload
    if (result) {
      this.needsUpload = false
    }
    return result
  }
}

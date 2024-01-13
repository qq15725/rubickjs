import { Resource } from '../Resource'
import { protectedProperty } from '../decorators'
import { VertexBuffer } from './VertexBuffer'

export interface VertexAttributeProperties {
  buffer?: VertexBuffer
  size?: number
  normalized?: boolean
  type?: 'float' | 'unsigned_byte' | 'unsigned_short'
  stride?: number
  offset?: number
  divisor?: number
}

export class VertexAttribute extends Resource {
  @protectedProperty() buffer!: VertexBuffer
  @protectedProperty({ default: 0 }) size!: number
  @protectedProperty({ default: false }) normalized!: boolean
  @protectedProperty({ default: 'float' }) type!: 'float' | 'unsigned_byte' | 'unsigned_short'
  @protectedProperty() stride?: number
  @protectedProperty() offset?: number
  @protectedProperty() divisor?: number

  needsUpload = false

  constructor(properties: VertexAttributeProperties = {}) {
    super()
    this.setProperties({
      buffer: new VertexBuffer(),
      ...properties,
    })
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

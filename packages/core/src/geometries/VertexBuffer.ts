import { Resource } from '../Resource'
import { property } from '../decorators'
import type { WebGLBufferOptions, WebGLRenderer } from '@rubickjs/renderer'

export interface VertexBufferOptions {
  data?: BufferSource | null
  dynamic?: boolean
}

export class VertexBuffer extends Resource {
  @property() data: BufferSource | null
  @property() dynamic: boolean

  needsUpload = false

  constructor(options: VertexBufferOptions = {}) {
    super()

    this.data = options.data ?? null
    this.dynamic = options.dynamic ?? false
  }

  /** @internal */
  _glBufferOptions(): WebGLBufferOptions {
    return {
      target: 'array_buffer',
      data: this.data,
      usage: this.dynamic ? 'dynamic_draw' : 'static_draw',
    }
  }

  /** @internal */
  _glBuffer(renderer: WebGLRenderer): WebGLBuffer {
    return renderer.getRelated(this, () => {
      return renderer.buffer.create(this._glBufferOptions())
    })
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any) {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'data':
      case 'dynamic':
        this.needsUpload = true
        break
    }
  }

  upload(renderer: WebGLRenderer): boolean {
    const result = this.needsUpload
    if (result) {
      this.needsUpload = false
      renderer.buffer.update(
        this._glBuffer(renderer),
        this._glBufferOptions(),
      )
    }
    return result
  }
}

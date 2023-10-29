import { Resource } from '../Resource'
import { property } from '../decorators'
import type { WebGLBufferOptions, WebGLRenderer } from '@rubickjs/renderer'

export interface IndexBufferOptions {
  data?: Uint16Array | null
  dynamic?: boolean
}

export class IndexBuffer extends Resource {
  @property() data: Uint16Array | null
  @property() dynamic: boolean

  needsUpload = false

  constructor(options: IndexBufferOptions = {}) {
    super()

    this.data = options?.data ?? null
    this.dynamic = options?.dynamic ?? false
  }

  /** @internal */
  _glBufferOptions(): WebGLBufferOptions {
    return {
      target: 'element_array_buffer',
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

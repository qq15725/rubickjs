import { EventEmitter, uid } from '@rubickjs/shared'
import { getCurrentRenderer } from '@rubickjs/renderer'

export class Resouce extends EventEmitter {
  uid = uid()

  dirty = new Set<string>()

  get renderer() { return getCurrentRenderer() }

  name = this.uid
}

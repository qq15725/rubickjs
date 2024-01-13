import { EventEmitter } from '@rubickjs/shared'

let UID = 0
export class EventTarget extends EventEmitter {
  readonly instanceId = ++UID

  notification(_what: string) { /** override */ }
}

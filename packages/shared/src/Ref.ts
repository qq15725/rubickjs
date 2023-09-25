import { EventEmitter } from './EventEmitter'

export interface Ref<T> {
  addEventListener(type: 'update', listener: (this: Ref<T>, value: T, oldValue: T | undefined) => any, options?: boolean | AddEventListenerOptions): this
  removeEventListener(type: 'update', listener: (this: Ref<T>, value: T, oldValue: T | undefined) => any, options?: boolean | EventListenerOptions): this
  on(type: 'update', listener: (this: Ref<T>, value: T, oldValue: T | undefined) => any, options?: boolean | AddEventListenerOptions): this
  off(type: 'update', listener: (this: Ref<T>, value: T, oldValue: T | undefined) => any, options?: boolean | EventListenerOptions): this
}

export class Ref<T> extends EventEmitter {
  dirtyId = -1

  get value() { return this._value }
  set value(val) {
    const oldVal = this._value
    if (val !== oldVal) {
      this._value = val
      this.dirtyId++
      this.emit('update', val, oldVal)
    }
  }

  constructor(
    protected _value: T,
  ) {
    super()
  }
}

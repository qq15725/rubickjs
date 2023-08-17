import { EventEmitter } from './EventEmitter'

export interface Ref<T> {
  addEventListener(type: 'update', listener: (this: Ref<T>, value: T, oldValue: T | undefined) => any, options?: boolean | AddEventListenerOptions): void
  removeEventListener(type: 'update', listener: (this: Ref<T>, value: T, oldValue: T | undefined) => any, options?: boolean | EventListenerOptions): void
  on(type: 'update', listener: (this: Ref<T>, value: T, oldValue: T | undefined) => any, options?: boolean | AddEventListenerOptions): void
  off(type: 'update', listener: (this: Ref<T>, value: T, oldValue: T | undefined) => any, options?: boolean | EventListenerOptions): void
}

export class Ref<T> extends EventEmitter {
  get value() { return this._value }
  set value(val) {
    const oldVal = this._value
    if (val !== oldVal) {
      this._value = val
      this.emit('update', val, oldVal)
    }
  }

  constructor(
    protected _value: T,
  ) {
    super()
  }
}

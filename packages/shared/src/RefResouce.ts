import { Resouce } from './Resouce'

export interface RefResouce<T> {
  addEventListener(type: 'update:value', listener: (this: RefResouce<T>, value: T, oldValue: T | undefined) => any, options?: boolean | AddEventListenerOptions): void
  removeEventListener(type: 'update:value', listener: (this: RefResouce<T>, value: T, oldValue: T | undefined) => any, options?: boolean | EventListenerOptions): void
  on(type: 'update:value', listener: (this: RefResouce<T>, value: T, oldValue: T | undefined) => any, options?: boolean | AddEventListenerOptions): void
  off(type: 'update:value', listener: (this: RefResouce<T>, value: T, oldValue: T | undefined) => any, options?: boolean | EventListenerOptions): void
}

export class RefResouce<T> extends Resouce {
  get value() { return this._value }
  set value(val) {
    const oldVal = this._value
    if (val !== oldVal) {
      this._value = val
      this.emit('update:value', val, oldVal)
      this.addDirty('value')
    }
  }

  protected _uploadValue() {
    //
  }

  constructor(
    protected _value: T,
  ) {
    super()
  }
}

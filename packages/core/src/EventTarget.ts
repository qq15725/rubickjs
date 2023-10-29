type Listener = (...args: any[]) => void
type Options = boolean | AddEventListenerOptions
interface EventListener {
  value: Listener
  options?: Options
}

let UID = 0
export class EventTarget {
  readonly instanceId = ++UID

  protected _listeners = new Map<string, EventListener | Array<EventListener>>()

  on(event: string, listener: Listener, options?: Options): this {
    const object = { value: listener, options }
    const listeners = this._listeners.get(event)
    if (!listeners) {
      this._listeners.set(event, object)
    } else if (Array.isArray(listeners)) {
      listeners.push(object)
    } else {
      this._listeners.set(event, [listeners, object])
    }
    return this
  }

  once(event: string, listener: Listener): this {
    return this.on(event, listener, { once: true })
  }

  off(event: string, listener: Listener, options?: Options): this {
    if (!listener) {
      this._listeners.delete(event)
      return this
    }

    const listeners = this._listeners.get(event)

    if (!listeners) {
      return this
    }

    if (Array.isArray(listeners)) {
      const events = []
      for (let i = 0, length = listeners.length; i < length; i++) {
        const object = listeners[i]
        if (
          object.value !== listener
          || (
            typeof options === 'object' && options?.once
            && (typeof object.options === 'boolean' || !object.options?.once)
          )
        ) {
          events.push(object)
        }
      }
      if (events.length) {
        this._listeners.set(event, events.length === 1 ? events[0] : events)
      } else {
        this._listeners.delete(event)
      }
    } else {
      if (
        listeners.value === listener
        && (
          (typeof options === 'boolean' || !options?.once)
          || (typeof listeners.options === 'boolean' || listeners.options?.once)
        )
      ) {
        this._listeners.delete(event)
      }
    }
    return this
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this._listeners.get(event)

    if (listeners) {
      if (Array.isArray(listeners)) {
        for (let len = listeners.length, i = 0; i < len; i++) {
          const object = listeners[i]
          if (typeof object.options === 'object' && object.options?.once) {
            this.off(event, object.value, object.options)
          }
          object.value.apply(this, args)
        }
      } else {
        if (typeof listeners.options === 'object' && listeners.options?.once) {
          this.off(event, listeners.value, listeners.options)
        }
        listeners.value.apply(this, args)
      }
      return true
    } else {
      return false
    }
  }

  removeAllListeners(): this {
    this._listeners.clear()
    return this
  }

  hasEventListener(event: string): boolean {
    return this._listeners.has(event)
  }

  notification(_what: string) { /** override */ }
}

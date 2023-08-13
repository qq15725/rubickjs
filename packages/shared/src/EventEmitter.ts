interface EventListener {
  (...args: any[]): void
}

interface EventListenerObject {
  value: EventListener
  options?: boolean | AddEventListenerOptions
}

export class EventEmitter {
  protected readonly _eventListeners = new Map<string, EventListenerObject | EventListenerObject[]>()

  addEventListener(event: string, listener: EventListener, options?: boolean | AddEventListenerOptions): void {
    const object = { value: listener, options }
    const listeners = this._eventListeners.get(event)
    if (!listeners) {
      this._eventListeners.set(event, object)
    } else if (Array.isArray(listeners)) {
      listeners.push(object)
    } else {
      this._eventListeners.set(event, [listeners, object])
    }
  }

  removeEventListener(event: string, listener: EventListener, options?: boolean | AddEventListenerOptions): void {
    if (!listener) {
      this._eventListeners.delete(event)
      return
    }

    const listeners = this._eventListeners.get(event)

    if (!listeners) {
      return
    }

    if (Array.isArray(listeners)) {
      const events = []
      for (let i = 0, length = listeners.length; i < length; i++) {
        const object = listeners[i]
        if (
          object.value !== listener
          || (
            (typeof options === 'object' && options?.once)
            && (typeof object.options === 'boolean' || !object.options?.once)
          )
        ) {
          events.push(object)
        }
      }
      if (events.length) {
        this._eventListeners.set(event, events.length === 1 ? events[0] : events)
      } else {
        this._eventListeners.delete(event)
      }
    } else {
      if (
        listeners.value === listener
        && (
          (typeof options === 'object' && options?.once)
          && (typeof listeners.options === 'boolean' || !listeners.options?.once)
        )
      ) {
        this._eventListeners.delete(event)
      }
    }
  }

  hasEventListener(event: string): boolean {
    return this._eventListeners.has(event)
  }

  dispatchEvent(event: string, ...args: any[]): boolean {
    const listeners = this._eventListeners.get(event)

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

  on(event: string, listener: EventListener, options?: boolean | AddEventListenerOptions): void {
    return this.addEventListener(event, listener, options)
  }

  off(event: string, listener: EventListener, options?: boolean | AddEventListenerOptions): void {
    return this.removeEventListener(event, listener, options)
  }

  emit(event: string, ...args: any[]): boolean {
    return this.dispatchEvent(event, ...args)
  }
}

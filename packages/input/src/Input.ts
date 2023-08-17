import { EventEmitter, SUPPORTS_POINTER_EVENTS, SUPPORTS_TOUCH_EVENTS, SUPPORTS_WHEEL_EVENTS } from '@rubickjs/shared'
import { PointerInputEvent } from './PointerInputEvent'
import { WheelInputEvent } from './WheelInputEvent'
import type { MouseInputEvent } from './MouseInputEvent'
import type { Cursor } from './Cursor'

const TOUCH_TO_POINTER: Record<string, string> = {
  touchstart: 'pointerdown',
  touchend: 'pointerup',
  touchendoutside: 'pointerupoutside',
  touchmove: 'pointermove',
  touchcancel: 'pointercancel',
}

export class Input extends EventEmitter {
  target?: HTMLElement
  cursor: Cursor | string = 'default'
  cursorStyles: Record<string, any> = {
    default: 'inherit',
    pointer: 'pointer',
  }

  setuped = false

  /**
   * Current event
   */
  event?: PointerInputEvent | WheelInputEvent | MouseInputEvent

  enableMoveEvent = true
  enableWheelEvent = true
  enableClickEvent = true

  setTarget(target: HTMLElement) {
    this._removeEventListeners()
    this.target = target
    this._addEventListeners()
  }

  protected _removeEventListeners() {
    if (!this.setuped || !this.target) {
      return
    }
    const style = this.target.style as Record<string, any>
    if ((globalThis.navigator as any).msPointerEnabled) {
      style.msContentZooming = ''
      style.msTouchAction = ''
    } else if (SUPPORTS_POINTER_EVENTS) {
      style.touchAction = ''
    }
    if (SUPPORTS_POINTER_EVENTS) {
      this.target.removeEventListener('pointerdown', this._onPointerDown, true)
      this.target.removeEventListener('pointerleave', this._onPointerOver, true)
      this.target.removeEventListener('pointerover', this._onPointerOver, true)
      globalThis.document.removeEventListener('pointermove', this._onPointerMove, true)
      globalThis.removeEventListener('pointerup', this._onPointerUp, true)
    } else {
      this.target.removeEventListener('mousedown', this._onPointerDown, true)
      this.target.removeEventListener('mouseout', this._onPointerOver, true)
      this.target.removeEventListener('mouseover', this._onPointerOver, true)
      globalThis.document.removeEventListener('mousemove', this._onPointerMove, true)
      globalThis.removeEventListener('mouseup', this._onPointerUp, true)
    }
    if (SUPPORTS_TOUCH_EVENTS) {
      this.target.removeEventListener('touchstart', this._onPointerDown, true)
      this.target.removeEventListener('touchmove', this._onPointerMove, true)
      this.target.removeEventListener('touchend', this._onPointerUp, true)
    }
    this.target.removeEventListener('wheel', this.onWheel, true)
    this.target = undefined
    this.setuped = false
  }

  protected _addEventListeners() {
    if (this.setuped || !this.target) {
      return
    }
    const style = this.target.style as Record<string, any>
    if (style) {
      if ((globalThis.navigator as any).msPointerEnabled) {
        style.msContentZooming = 'none'
        style.msTouchAction = 'none'
      } else if (SUPPORTS_POINTER_EVENTS) {
        style.touchAction = 'none'
      }
    }
    if (SUPPORTS_POINTER_EVENTS) {
      this.target.addEventListener('pointerdown', this._onPointerDown, true)
      this.target.addEventListener('pointerleave', this._onPointerOver, true)
      this.target.addEventListener('pointerover', this._onPointerOver, true)
      globalThis.document.addEventListener('pointermove', this._onPointerMove, true)
      globalThis.addEventListener('pointerup', this._onPointerUp, true)
    } else {
      this.target.addEventListener('mousedown', this._onPointerDown, true)
      this.target.addEventListener('mouseout', this._onPointerOver, true)
      this.target.addEventListener('mouseover', this._onPointerOver, true)
      globalThis.document.addEventListener('mousemove', this._onPointerMove, true)
      globalThis.addEventListener('mouseup', this._onPointerUp, true)
    }
    if (SUPPORTS_TOUCH_EVENTS) {
      this.target.addEventListener('touchstart', this._onPointerDown, true)
      this.target.addEventListener('touchmove', this._onPointerMove, true)
      this.target.addEventListener('touchend', this._onPointerUp, true)
    }
    this.target.addEventListener('wheel', this.onWheel, {
      passive: true,
      capture: true,
    })
    this.setuped = true
  }

  protected _normalize(event: WheelEvent): WheelEvent[]
  protected _normalize(event: TouchEvent | PointerEvent | MouseEvent): PointerEvent[]
  protected _normalize(event: any): any[] {
    const events = []
    if (SUPPORTS_TOUCH_EVENTS && event instanceof globalThis.TouchEvent) {
      for (let i = 0, li = event.changedTouches.length; i < li; i++) {
        const touch = event.changedTouches[i] as Record<string, any>
        if (typeof touch.button === 'undefined') touch.button = 0
        if (typeof touch.buttons === 'undefined') touch.buttons = 1
        if (typeof touch.isPrimary === 'undefined') {
          touch.isPrimary = event.touches.length === 1 && event.type === 'touchstart'
        }
        if (typeof touch.width === 'undefined') touch.width = touch.radiusX || 1
        if (typeof touch.height === 'undefined') touch.height = touch.radiusY || 1
        if (typeof touch.tiltX === 'undefined') touch.tiltX = 0
        if (typeof touch.tiltY === 'undefined') touch.tiltY = 0
        if (typeof touch.pointerType === 'undefined') touch.pointerType = 'touch'
        if (typeof touch.pointerId === 'undefined') touch.pointerId = touch.identifier || 0
        if (typeof touch.pressure === 'undefined') touch.pressure = touch.force || 0.5
        if (typeof touch.twist === 'undefined') touch.twist = 0
        if (typeof touch.tangentialPressure === 'undefined') touch.tangentialPressure = 0
        if (typeof touch.layerX === 'undefined') touch.layerX = touch.offsetX = touch.clientX
        if (typeof touch.layerY === 'undefined') touch.layerY = touch.offsetY = touch.clientY
        touch.type = event.type
        events.push(touch)
      }
    } else if (SUPPORTS_WHEEL_EVENTS && event instanceof globalThis.WheelEvent) {
      events.push(event)
    } else if (SUPPORTS_POINTER_EVENTS && event instanceof globalThis.PointerEvent) {
      events.push(event)
    } else {
      const mouse = event as any
      if (typeof mouse.isPrimary === 'undefined') mouse.isPrimary = true
      if (typeof mouse.width === 'undefined') mouse.width = 1
      if (typeof mouse.height === 'undefined') mouse.height = 1
      if (typeof mouse.tiltX === 'undefined') mouse.tiltX = 0
      if (typeof mouse.tiltY === 'undefined') mouse.tiltY = 0
      if (typeof mouse.pointerType === 'undefined') mouse.pointerType = 'mouse'
      if (typeof mouse.pointerId === 'undefined') mouse.pointerId = 1
      if (typeof mouse.pressure === 'undefined') mouse.pressure = 0.5
      if (typeof mouse.twist === 'undefined') mouse.twist = 0
      if (typeof mouse.tangentialPressure === 'undefined') mouse.tangentialPressure = 0
      events.push(mouse)
    }

    return events as any
  }

  protected _cloneWheelEvent(nativeEvent: WheelEvent): WheelInputEvent {
    const event = new WheelInputEvent()
    this._copyMouseEvent(event, nativeEvent)
    event.deltaX = nativeEvent.deltaX
    event.deltaY = nativeEvent.deltaY
    event.deltaZ = nativeEvent.deltaZ
    event.deltaMode = nativeEvent.deltaMode
    this._mapPositionToPoint(event.screen, nativeEvent.clientX, nativeEvent.clientY)
    event.global.x = event.screen.x
    event.global.y = event.screen.y
    event.offset.x = event.screen.x
    event.offset.y = event.screen.y
    event.nativeEvent = nativeEvent
    event.type = nativeEvent.type
    return event
  }

  protected _clonePointerEvent(nativeEvent: PointerEvent): PointerInputEvent {
    const event = new PointerInputEvent()
    event.originalEvent = null
    event.nativeEvent = nativeEvent
    event.pointerId = nativeEvent.pointerId
    event.width = nativeEvent.width
    event.height = nativeEvent.height
    event.isPrimary = nativeEvent.isPrimary
    event.pointerType = nativeEvent.pointerType
    event.pressure = nativeEvent.pressure
    event.tangentialPressure = nativeEvent.tangentialPressure
    event.tiltX = nativeEvent.tiltX
    event.tiltY = nativeEvent.tiltY
    event.twist = nativeEvent.twist
    event.isTrusted = nativeEvent.isTrusted
    this._copyMouseEvent(event, nativeEvent)
    this._mapPositionToPoint(event.screen, nativeEvent.clientX, nativeEvent.clientY)
    event.global.x = event.screen.x
    event.global.y = event.screen.y
    event.offset.x = event.screen.x
    event.offset.y = event.screen.y
    if (event.type === 'pointerleave') {
      event.type = 'pointerout'
    } else if (event.type.startsWith('mouse')) {
      event.type = event.type.replace('mouse', 'pointer')
    } else if (event.type.startsWith('touch')) {
      event.type = TOUCH_TO_POINTER[event.type] || event.type
    }
    return event
  }

  protected _copyMouseEvent(event: MouseInputEvent, nativeEvent: MouseEvent): void {
    event.isTrusted = nativeEvent.isTrusted
    event.timeStamp = performance.now()
    event.type = nativeEvent.type
    event.altKey = nativeEvent.altKey
    event.button = nativeEvent.button
    event.buttons = nativeEvent.buttons
    event.client.x = nativeEvent.clientX
    event.client.y = nativeEvent.clientY
    event.ctrlKey = nativeEvent.ctrlKey
    event.metaKey = nativeEvent.metaKey
    event.movement.x = nativeEvent.movementX
    event.movement.y = nativeEvent.movementY
    event.page.x = nativeEvent.pageX
    event.page.y = nativeEvent.pageY
    event.relatedTarget = null
    event.shiftKey = nativeEvent.shiftKey
  }

  /**
   * Sets the current cursor mode, handling any callbacks or CSS style changes.
   * @param mode - cursor mode, a key from the cursorStyles dictionary
   */
  setCursor(mode: string): void {
    if (!this.target) return
    mode = mode || 'default'
    if (this.cursor === mode) {
      return
    }
    this.cursor = mode
    const applyStyles = !(globalThis.OffscreenCanvas && this.target instanceof OffscreenCanvas)
    const style = this.cursorStyles[mode]
    if (style) {
      switch (typeof style) {
        case 'string':
          if (applyStyles) {
            this.target.style.cursor = style
          }
          break
        case 'function':
          style(mode)
          break
        case 'object':
          if (applyStyles) {
            Object.assign(this.target.style, style)
          }
          break
      }
    } else if (
      applyStyles
      && typeof mode === 'string'
      && !Object.prototype.hasOwnProperty.call(this.cursorStyles, mode)
    ) {
      this.target.style.cursor = mode
    }
  }

  protected _mapPositionToPoint(point: { x: number; y: number }, x: number, y: number): void {
    if (!this.target) return
    const width = Number(this.target.getAttribute('width')) || 0
    const height = Number(this.target.getAttribute('height')) || 0
    const pixelRatio = Number(this.target.getAttribute('pixel-ratio')) || 1
    const rect = this.target.isConnected
      ? this.target.getBoundingClientRect()
      : {
          x: 0,
          y: 0,
          width,
          height,
          left: 0,
          top: 0,
        }
    const multiplier = 1.0 / pixelRatio
    point.x = ((x - rect.left) * (width / rect.width)) * multiplier
    point.y = ((y - rect.top) * (height / rect.height)) * multiplier
  }

  protected _onPointerDown = (nativeEvent: PointerEvent | TouchEvent | MouseEvent) => {
    if (SUPPORTS_TOUCH_EVENTS && (nativeEvent as PointerEvent).pointerType === 'touch') return
    const events = this._normalize(nativeEvent)
    if (!('cancelable' in nativeEvent) || nativeEvent.cancelable) {
      nativeEvent.preventDefault()
    }
    for (let i = 0, len = events.length; i < len; i++) {
      this.emit('pointerdown', this.event = this._clonePointerEvent(events[i]))
    }
    this.setCursor(this.cursor)
  }

  protected _onPointerOver = (nativeEvent: PointerEvent | TouchEvent | MouseEvent): void => {
    if (!this.enableClickEvent) return
    if (SUPPORTS_TOUCH_EVENTS && (nativeEvent as PointerEvent).pointerType === 'touch') return
    const events = this._normalize(nativeEvent)
    for (let i = 0, len = events.length; i < len; i++) {
      this.emit('pointerover', this.event = this._clonePointerEvent(events[i]))
    }
  }

  protected _onPointerMove = (nativeEvent: PointerEvent | TouchEvent | MouseEvent): void => {
    if (!this.enableMoveEvent) return
    if (SUPPORTS_TOUCH_EVENTS && (nativeEvent as PointerEvent).pointerType === 'touch') return
    const events = this._normalize(nativeEvent)
    for (let i = 0, len = events.length; i < len; i++) {
      this.emit('pointermove', this.event = this._clonePointerEvent(events[i]))
    }
  }

  protected _onPointerUp = (nativeEvent: PointerEvent | TouchEvent | MouseEvent): void => {
    if (!this.enableClickEvent) return
    if (SUPPORTS_TOUCH_EVENTS && (nativeEvent as PointerEvent).pointerType === 'touch') return
    let target = nativeEvent.target
    if (nativeEvent.composedPath && nativeEvent.composedPath().length > 0) {
      target = nativeEvent.composedPath()[0]
    }
    const outside = target !== this.target ? 'outside' : ''
    const events = this._normalize(nativeEvent)
    for (let i = 0, len = events.length; i < len; i++) {
      const event = this._clonePointerEvent(events[i])
      event.type += outside
      this.emit('pointerup', this.event = event)
    }
  }

  protected onWheel = (nativeEvent: WheelEvent): void => {
    if (!this.enableWheelEvent) return
    const events = this._normalize(nativeEvent)
    for (let i = 0, len = events.length; i < len; i++) {
      this.emit('wheel', this.event = this._cloneWheelEvent(events[i]))
    }
  }
}

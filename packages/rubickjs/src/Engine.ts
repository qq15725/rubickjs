import { Color } from '@rubickjs/color'
import { WebGLRenderer } from '@rubickjs/renderer'
import { InternalMode, SceneTree, nextTick } from '@rubickjs/core'
import { DEVICE_PIXEL_RATIO, EventEmitter, SUPPORTS_RESIZE_OBSERVER } from '@rubickjs/shared'
import { Input } from '@rubickjs/input'
import { Assets } from '@rubickjs/assets'
import type { EngineOptions } from './EngineOptions'
import type { PointerInputEvent, WheelInputEvent } from '@rubickjs/input'
import type { ColorValue } from '@rubickjs/color'
import type { Node, Timer, Viewport } from '@rubickjs/core'

export const defaultOptions = {
  alpha: true,
  stencil: true,
  antialias: false,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: 'default',
} as const

interface EngineEventMap {
  'pointerdown': PointerInputEvent
  'pointerover': PointerInputEvent
  'pointermove': PointerInputEvent
  'pointerup': PointerInputEvent
  'wheel': WheelInputEvent
}

export interface Engine {
  addEventListener<K extends keyof EngineEventMap>(type: K, listener: (this: Engine, ev: EngineEventMap[K]) => any, options?: boolean | AddEventListenerOptions): this
  removeEventListener<K extends keyof EngineEventMap>(type: K, listener: (this: Engine, ev: EngineEventMap[K]) => any, options?: boolean | EventListenerOptions): this
  on<K extends keyof EngineEventMap>(type: K, listener: (this: Engine, ev: EngineEventMap[K]) => any, options?: boolean | AddEventListenerOptions): this
  off<K extends keyof EngineEventMap>(type: K, listener: (this: Engine, ev: EngineEventMap[K]) => any, options?: boolean | EventListenerOptions): this
}

export class Engine extends EventEmitter {
  readonly input = new Input()
  readonly renderer: WebGLRenderer
  get pixelRatio(): number { return this.renderer.pixelRatio }
  get view(): HTMLCanvasElement | undefined { return this.renderer.view }
  get screen(): { x: number; y: number; width: number; height: number } { return this.renderer.screen }
  get width(): number { return this.screen.width }
  get height(): number { return this.screen.height }

  readonly resizeObserver = SUPPORTS_RESIZE_OBSERVER
    ? new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry.target === this.view) {
        const { inlineSize: width, blockSize: height } = Array.isArray(entry.contentBoxSize)
          ? entry.contentBoxSize[0]
          : entry.contentBoxSize
        this.resize(width, height, false)
      }
    })
    : undefined

  /**
   * Scene tree
   */
  readonly tree: SceneTree
  get timeline(): Timer { return this.tree.timeline }
  get root(): Viewport { return this.tree.root }
  get starting(): boolean { return this.tree.starting }

  /**
   * Background color
   */
  readonly background = new Color()

  /**
   * Data
   */
  data?: any

  constructor(options: EngineOptions = {}) {
    super()

    const {
      view,
      width,
      height,
      pixelRatio = DEVICE_PIXEL_RATIO,
      gl,
      timeline,
      data,
      background = 0x00000000,
      ...glOptions
    } = options

    this.tree = new SceneTree(timeline)
    this.data = data
    this.renderer = gl
      ? new WebGLRenderer(gl)
      : new WebGLRenderer(view, {
        ...defaultOptions,
        ...glOptions,
      })
    this.renderer.pixelRatio = pixelRatio
    this.view?.setAttribute('data-pixel-ratio', String(pixelRatio))

    this
      .setupContext()
      .setupInput()
      .resize(
        gl?.drawingBufferWidth || width || view?.clientWidth || 200,
        gl?.drawingBufferHeight || height || view?.clientHeight || 200,
        !view || (!view.style?.width && !view.style?.height),
      )
      .setBackground(background)
  }

  /**
   * Setup WebGL context
   */
  setupContext(): this {
    const gl = this.renderer.gl
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    return this
  }

  /**
   * Setup input
   */
  setupInput(): this {
    if (this.view) {
      this.input.setTarget(this.view)

      ;[
        'pointerdown',
        'pointerover',
        'pointermove',
        'pointerup',
        'wheel',
      ].forEach(event => {
        this.input.on(event, (e: any) => {
          if (this.hasEventListener(event)) {
            this.tree.input(e)
            this.emit(event, e)
          }
        })
      })
    }

    return this
  }

  /**
   * Set device pixel ratio
   *
   * @param value
   */
  setPixelRatio(value: number): this {
    this.renderer.pixelRatio = value
    this.resize(this.width, this.height, false)
    this.view?.setAttribute('data-pixel-ratio', String(value))
    return this
  }

  /**
   * Set background color
   *
   * @param value
   */
  setBackground(value: ColorValue): this {
    this.background.value = value
    const { r, g, b, a } = this.background
    this.renderer.gl.clearColor(r, g, b, a)
    return this
  }

  /**
   * Start observe view
   */
  observe(): this {
    this.view && this.resizeObserver?.observe(this.view)
    return this
  }

  /**
   * Stop observe view
   */
  unobserve(): this {
    this.view && this.resizeObserver?.unobserve(this.view)
    return this
  }

  /**
   * Resize view
   *
   * @param width
   * @param height
   * @param updateCss
   */
  resize(width: number, height: number, updateCss = true): this {
    this.renderer.resize(width, height, updateCss)
    this.root.width = width
    this.root.height = height
    return this
  }

  addChild(node: Node, internal = InternalMode.DEFAULT): this {
    this.root.addChild(node, internal)
    return this
  }

  nextTick(): Promise<void> {
    return nextTick()
  }

  waitUntilLoad(): Promise<void> {
    return Assets.waitUntilLoad()
  }

  /**
   * Render scene tree
   */
  render(delta?: number): void {
    if (delta !== undefined) this.tree.deltaTime = delta
    this.tree.render(this.renderer)
  }

  /**
   * Start main loop
   *
   * @param fps
   * @param speed
   */
  start(fps = 24, speed = 1): void {
    this.tree.fps = fps
    this.tree.speed = speed
    this.render()
    this.tree.startLoop(delta => this.render(delta))
  }

  /**
   * Stop main loop
   */
  stop(): void {
    this.tree.stopLoop()
  }

  /**
   * Destroy application
   */
  destroy(): void {
    this.stop()
    this.root.getChildren(true)
      .forEach(node => this.root.removeChild(node))
    this.input.removeEventListeners()
    this.unobserve()
    this.renderer.destroy()
    this.data = undefined
  }

  /**
   * To pixels
   */
  toPixels(): Uint8ClampedArray {
    return this.renderer.toPixels()
  }
}

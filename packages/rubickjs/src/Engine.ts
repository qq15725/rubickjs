import { Color } from '@rubickjs/color'
import { WebGLRenderer } from '@rubickjs/renderer'
import { SceneTree } from '@rubickjs/core'
import { DEVICE_PIXEL_RATIO, EventEmitter, SUPPORTS_RESIZE_OBSERVER, createHTMLCanvas } from '@rubickjs/shared'
import { Input } from '@rubickjs/input'
import type { Timer, Viewport } from '@rubickjs/core'
import type { EngineOptions } from './EngineOptions'
import type { PointerInputEvent, WheelInputEvent } from '@rubickjs/input'

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
  /**
   * Input
   */
  readonly input = new Input()

  /**
   * WebGLRenderer
   */
  readonly renderer: WebGLRenderer

  /**
   * Device pixel ratio
   */
  get pixelRatio(): number { return this.renderer.pixelRatio }
  set pixelRatio(val) {
    if (this.renderer.pixelRatio !== val) {
      this.renderer.pixelRatio = val
      this.resize(this.width, this.height, false)
    }
  }

  get view(): HTMLCanvasElement | undefined { return this.renderer.view }
  get screen(): { x: number; y: number; width: number; height: number } { return this.renderer.screen }
  get width(): number { return this.screen.width }
  get height(): number { return this.screen.height }

  protected _resizeObserver = SUPPORTS_RESIZE_OBSERVER
    ? new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry.target === this.view) {
        if (this.view.style.width && this.view.style.height) {
          const { inlineSize: width, blockSize: height } = Array.isArray(entry.contentBoxSize)
            ? entry.contentBoxSize[0]
            : entry.contentBoxSize
          this.resize(width, height, false)
        }
      }
    })
    : undefined

  /**
   * Scene tree
   */
  readonly tree = new SceneTree()
  get timeline(): Timer { return this.tree.timeline }
  get root(): Viewport { return this.tree.root }

  /**
   * Background color
   */
  protected _background = new Color()
  get background() { return this._background.source }
  set background(val) {
    this._background.source = val
    const { r, g, b, a } = this._background
    this.renderer.gl.clearColor(r, g, b, a)
  }

  constructor(options: EngineOptions = {}) {
    super()

    const {
      view,
      width,
      height,
      pixelRatio = DEVICE_PIXEL_RATIO,
      gl,
      background = [0, 0, 0, 0],
      ...rendererOptions
    } = options

    this.tree = new SceneTree()
    this.renderer = new WebGLRenderer(gl ?? view ?? createHTMLCanvas(), {
      alpha: true,
      stencil: true,
      antialias: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
      ...rendererOptions,
    })
    this.renderer.pixelRatio = pixelRatio

    this
      ._setupContext()
      ._setupInput()
      .resize(
        gl?.drawingBufferWidth || width || view?.clientWidth || 200,
        gl?.drawingBufferHeight || height || view?.clientHeight || 200,
        !view || (!view.style?.width && !view.style?.height),
      )

    this.background = background
  }

  /**
   * Setup WebGL context
   */
  protected _setupContext(): this {
    const gl = this.renderer.gl
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.depthMask(false)
    return this
  }

  /**
   * Setup input
   */
  protected _setupInput(): this {
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
   * Start observe view
   */
  observeView(): this {
    if (this.view) this._resizeObserver?.observe(this.view)
    return this
  }

  /**
   * Stop observe view
   */
  unobserveView(): this {
    if (this.view) this._resizeObserver?.unobserve(this.view)
    return this
  }

  /**
   * Resize view
   *
   * @param width
   * @param height
   * @param updateStyle
   */
  resize(width: number, height: number, updateStyle = true): this {
    this.root.size.update(width, height)
    this.renderer.resize(width, height, updateStyle)
    return this
  }

  /**
   * Render scene tree
   */
  render(delta = 0): void {
    if (delta !== undefined) this.tree.processDeltaTime = delta
    this.tree.render(this.renderer)
  }

  /**
   * Start main loop
   */
  start(fps = 60, speed = 1): void {
    this.tree.fps = fps
    this.tree.speed = speed
    this.tree.startLoop(delta => {
      this.render(delta)
    })
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
    this.root.getChildren(true).forEach(node => {
      this.root.removeChild(node)
    })
    this.unobserveView()
    this.renderer.destroy()
  }

  /**
   * To pixels
   */
  toPixels(): Uint8ClampedArray {
    return this.renderer.toPixels()
  }
}

import { Color } from '@rubickjs/math'
import { WebGLRenderer, setCurrentRenderer } from '@rubickjs/renderer'
import { SceneTree } from '@rubickjs/scene'
import { DEVICE_PIXEL_RATIO, EventEmitter, SUPPORTS_RESIZE_OBSERVER, createHTMLCanvas } from '@rubickjs/shared'
import { Input } from '@rubickjs/input'
import type { PointerInputEvent, WheelInputEvent } from '@rubickjs/input'
import type { ColorValue } from '@rubickjs/math'
import type { Node, Timeline, Viewport } from '@rubickjs/scene'

export interface CanvasOptions extends WebGLContextAttributes {
  view?: HTMLCanvasElement | null
  width?: number
  height?: number
  pixelRatio?: number
  gl?: WebGLRenderingContext | WebGL2RenderingContext
  timeline?: Timeline
  background?: ColorValue
}

export const defaultOptions = {
  alpha: true,
  stencil: true,
  antialias: false,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: 'default',
} as const

interface CanvasEventMap {
  'pointerdown': PointerInputEvent
  'pointerover': PointerInputEvent
  'pointermove': PointerInputEvent
  'pointerup': PointerInputEvent
  'wheel': WheelInputEvent
}

export interface Canvas {
  addEventListener<K extends keyof CanvasEventMap>(type: K, listener: (this: Canvas, ev: CanvasEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void
  removeEventListener<K extends keyof CanvasEventMap>(type: K, listener: (this: Canvas, ev: CanvasEventMap[K]) => any, options?: boolean | EventListenerOptions): void
  on<K extends keyof CanvasEventMap>(type: K, listener: (this: Canvas, ev: CanvasEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void
  off<K extends keyof CanvasEventMap>(type: K, listener: (this: Canvas, ev: CanvasEventMap[K]) => any, options?: boolean | EventListenerOptions): void
}

export class Canvas extends EventEmitter {
  /**
   * Input
   */
  readonly input = new Input()

  /**
   * WebGLRenderer
   */
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
  get timeline(): Timeline { return this.tree.timeline }
  get root(): Viewport { return this.tree.root }

  /**
   * Background color
   */
  readonly background = new Color()

  constructor(options: CanvasOptions = {}) {
    super()

    const {
      view,
      width,
      height,
      pixelRatio = DEVICE_PIXEL_RATIO,
      gl,
      timeline,
      background = [0, 0, 0, 0],
      ...glOptions
    } = options

    this.tree = new SceneTree(timeline)
    this.renderer = new WebGLRenderer(gl ?? view ?? createHTMLCanvas(), {
      ...defaultOptions,
      ...glOptions,
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
      .setBackground(background)
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
   * Set device pixel ratio
   *
   * @param value
   */
  setPixelRatio(value: number): this {
    this.renderer.pixelRatio = value
    this.resize(this.width, this.height, false)
    return this
  }

  /**
   * Set background color
   *
   * @param value
   */
  setBackground(value: ColorValue): this {
    this.background.normalize(value)
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
    this.root.size.update(width, height)
    this.renderer.uniforms.projectionMatrix = this.root.projection.toArray(true)
    return this
  }

  /**
   * Adds a child node.
   * Nodes can have any number of children, but every child must have a unique name.
   * Child nodes are automatically deleted when the parent node is deleted, so an entire scene can be removed by deleting its topmost node.
   */
  addChild<T extends Node, D extends Node>(node: T, previousSibling?: D): boolean {
    return this.root.addChild(node, previousSibling)
  }

  /**
   * Render scene tree
   */
  render(delta = 0): void {
    setCurrentRenderer(this.renderer)
    this.tree.process(delta)
  }

  /**
   * Start main loop
   */
  start(fps = 60, speed = 1): void {
    this.tree.startLoop(fps, delta => {
      this.render(delta * speed)
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
    this.root.children.forEach(node => {
      this.root.removeChild(node)
    })
    this.unobserve()
    this.renderer.destroy()
  }

  /**
   * To pixels
   */
  toPixels(): Uint8ClampedArray {
    return this.renderer.toPixels()
  }
}

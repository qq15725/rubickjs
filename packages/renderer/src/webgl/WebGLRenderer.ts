import { createHTMLCanvas, isCanvasElement, isWebgl2 } from '@rubickjs/shared'
import { Renderer } from '../Renderer'
import {
  WebGLBatch2DModule,
  WebGLBufferModule,
  WebGLFramebufferModule,
  WebGLMaskModule,
  WebGLProgramModule,
  WebGLScissorModule,
  WebGLStateModule,
  WebGLStencilModule,
  WebGLTextureModule,
  WebGLVertexArrayModule,
  WebGLViewportModule,
} from './modules'
import type {
  WebGLModule,
  WebGLModuleConstructor,
} from './modules'
import type {
  WebGLDrawOptions,
  WebGLExtensions,
  WebGLTarget,
} from './types'

export interface WebGLRenderer {
  texture: WebGLTextureModule
  buffer: WebGLBufferModule
  framebuffer: WebGLFramebufferModule
  program: WebGLProgramModule
  vertexArray: WebGLVertexArrayModule
  viewport: WebGLViewportModule
  state: WebGLStateModule
  mask: WebGLMaskModule
  scissor: WebGLScissorModule
  stencil: WebGLStencilModule
  batch2D: WebGLBatch2DModule
}

export class WebGLRenderer extends Renderer {
  static modules: Record<string, WebGLModuleConstructor> = {
    texture: WebGLTextureModule,
    buffer: WebGLBufferModule,
    framebuffer: WebGLFramebufferModule,
    program: WebGLProgramModule,
    vertexArray: WebGLVertexArrayModule,
    viewport: WebGLViewportModule,
    state: WebGLStateModule,
    mask: WebGLMaskModule,
    scissor: WebGLScissorModule,
    stencil: WebGLStencilModule,
    batch2D: WebGLBatch2DModule,
  }

  gl!: WebGLRenderingContext | WebGL2RenderingContext
  version!: 1 | 2
  extensions!: WebGLExtensions

  protected _modules = new Map<string, WebGLModule>()
  readonly bindPoints = new Map<number, WebGLTarget>()

  constructor(
    view: HTMLCanvasElement | WebGLRenderingContext | WebGL2RenderingContext = createHTMLCanvas()!,
    options?: WebGLContextAttributes,
  ) {
    super()

    if (!view) {
      throw new Error('Failed to createHTMLCanvas')
    }

    if (isCanvasElement(view)) {
      this._setupContext(view, options)
    } else {
      this.gl = view
      this.version = isWebgl2(this.gl) ? 2 : 1
    }

    this
      ._setupBindPoints()
      ._setupExtensions()
      ._setupPolyfill()

    for (const name in WebGLRenderer.modules) {
      this.register(name, WebGLRenderer.modules[name])
    }

    this._modules.forEach(module => module.onUpdateContext())
  }

  register<T extends WebGLModule>(name: string, Module: WebGLModuleConstructor<T>): T {
    const module = new Module(this)
    Object.defineProperty(this, name, {
      get() { return module },
      enumerable: true,
      configurable: true,
    })
    this._modules.set(name, module)
    return module
  }

  protected _setupContext(view: HTMLCanvasElement, options?: WebGLContextAttributes): this {
    this.view = view
    let gl = <any>(
      view.getContext('webgl2', options)
      || view.getContext('experimental-webgl2', options)
    )
    let version: 1 | 2 = 2

    if (!gl) {
      gl = view.getContext('webgl', options)
        || view.getContext('experimental-webgl', options)
      version = 1
    }

    if (!gl) {
      throw new Error('Unable to getContext')
    }

    this.gl = gl
    this.version = version

    view.addEventListener('webglcontextlost', this._onContextLost as any, false)
    view.addEventListener('webglcontextrestored', this._onContextRestored as any, false)

    return this
  }

  /**
   * Setup extensions
   *
   * @protected
   */
  protected _setupExtensions(): this {
    const gl = this.gl

    const extensions: Record<string, any> = {
      loseContext: gl.getExtension('WEBGL_lose_context'),
      anisotropicFiltering: gl.getExtension('EXT_texture_filter_anisotropic'),
      floatTextureLinear: gl.getExtension('OES_texture_float_linear'),
      s3tc: gl.getExtension('WEBGL_compressed_texture_s3tc'),
      s3tcSRGB: gl.getExtension('WEBGL_compressed_texture_s3tc_srgb'), // eslint-disable-line camelcase
      etc: gl.getExtension('WEBGL_compressed_texture_etc'),
      etc1: gl.getExtension('WEBGL_compressed_texture_etc1'),
      pvrtc: gl.getExtension('WEBGL_compressed_texture_pvrtc')
        || gl.getExtension('WEBKIT_WEBGL_compressed_texture_pvrtc'),
      atc: gl.getExtension('WEBGL_compressed_texture_atc'),
      astc: gl.getExtension('WEBGL_compressed_texture_astc'),
    }

    if (this.version === 1) {
      extensions.instancedArrays = gl.getExtension('ANGLE_instanced_arrays')
      extensions.drawBuffers = gl.getExtension('WEBGL_draw_buffers')
      extensions.depthTexture = gl.getExtension('WEBGL_depth_texture')
      extensions.vertexArrayObject = gl.getExtension('OES_vertex_array_object')
        || gl.getExtension('MOZ_OES_vertex_array_object')
        || gl.getExtension('WEBKIT_OES_vertex_array_object')
      extensions.uint32ElementIndex = gl.getExtension('OES_element_index_uint')
      // Floats and half-floats
      extensions.floatTexture = gl.getExtension('OES_texture_float')
      extensions.textureHalfFloat = gl.getExtension('OES_texture_half_float')
      extensions.textureHalfFloatLinear = gl.getExtension('OES_texture_half_float_linear')
    } else if (this.version === 2) {
      extensions.colorBufferFloat = gl.getExtension('EXT_color_buffer_float')
    }

    this.extensions = extensions

    return this
  }

  /**
   * Setup bind points
   *
   * @protected
   */
  protected _setupBindPoints(): this {
    for (const key in this.gl) {
      if (key === key.toUpperCase()) {
        const value = (this.gl as any)[key]
        if (typeof value === 'number') {
          this.bindPoints.set(value, key.toLowerCase() as any)
        }
      }
    }
    return this
  }

  /**
   * Setup polyfill
   *
   * @protected
   */
  protected _setupPolyfill(): this {
    if (this.version === 1) {
      const { instancedArrays, vertexArrayObject, drawBuffers } = this.extensions
      const polyfill = this.gl as WebGL2RenderingContext
      if (vertexArrayObject) {
        polyfill.createVertexArray = () => vertexArrayObject.createVertexArrayOES()
        polyfill.bindVertexArray = vao => vertexArrayObject.bindVertexArrayOES(vao)
        polyfill.deleteVertexArray = vao => vertexArrayObject.deleteVertexArrayOES(vao)
      }
      if (instancedArrays) {
        polyfill.vertexAttribDivisor = (a, b) => instancedArrays.vertexAttribDivisorANGLE(a, b)
        polyfill.drawElementsInstanced = (a, b, c, d, e) => instancedArrays.drawElementsInstancedANGLE(a, b, c, d, e)
        polyfill.drawArraysInstanced = (a, b, c, d) => instancedArrays.drawArraysInstancedANGLE(a, b, c, d)
      }
      if (drawBuffers) {
        polyfill.drawBuffers = (buffers: number[]) => drawBuffers.drawBuffersWEBGL(buffers)
      }
    }
    return this
  }

  protected _onContextLost(event: WebGLContextEvent) {
    event.preventDefault()
    setTimeout(() => {
      this.gl.isContextLost() && this.extensions.loseContext?.restoreContext()
    }, 0)
  }

  protected _onContextRestored() {}

  getBindPoint(target: WebGLTarget): number {
    return (this.gl as any)[target.toUpperCase()] as number
  }

  clear(
    mask = this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT,
  ): void {
    this.gl.clear(mask)
  }

  draw(options: WebGLDrawOptions = {}): void {
    const {
      mode = 'triangles',
      first = 0,
      instanceCount,
    } = options

    let {
      count = 0,
      bytesPerElement = 0,
    } = options

    if (!count || !bytesPerElement) {
      const buffer = this.vertexArray.boundVertexArray.elementArrayBuffer
        ?? Object.values(this.vertexArray.boundVertexArray.attributes)[0]
      if (buffer) {
        const meta = this.buffer.getMeta(buffer)
        if (!count) count = meta.length
        if (!bytesPerElement) bytesPerElement = meta.bytesPerElement
      }
    }

    const glMode = this.getBindPoint(mode)

    if (bytesPerElement) {
      if (bytesPerElement === 2 || (bytesPerElement === 4 && Boolean(this.extensions.uint32ElementIndex))) {
        const type = bytesPerElement === 2 ? this.gl.UNSIGNED_SHORT : this.gl.UNSIGNED_INT
        if (instanceCount && 'drawElementsInstanced' in this.gl) {
          this.gl.drawElementsInstanced(glMode, count, type, first * bytesPerElement, instanceCount)
        } else {
          this.gl.drawElements(glMode, count, type, first * bytesPerElement)
        }
      } else {
        console.warn('Unsupported index buffer type: uint32')
      }
    } else if (instanceCount && 'drawArraysInstanced' in this.gl) {
      this.gl.drawArraysInstanced(glMode, first, count, instanceCount)
    } else {
      this.gl.drawArrays(glMode, first, count)
    }
  }

  reset(): void {
    this._modules.forEach(module => module.reset())
  }

  flush(): void {
    this._modules.forEach(module => module.flush())
  }

  destroy(): void {
    this._modules.forEach(module => module.destroy())
    this.view?.removeEventListener('webglcontextlost', this._onContextLost as any)
    this.view?.removeEventListener('webglcontextrestored', this._onContextRestored as any)
    this.extensions.loseContext?.loseContext()
  }

  toPixels(): Uint8ClampedArray {
    const width = this.gl.drawingBufferWidth
    const height = this.gl.drawingBufferHeight
    const length = width * height * 4
    const row = width * 4
    const end = (height - 1) * row
    const flipedPixels = new Uint8Array(length)
    const pixels = new Uint8ClampedArray(length)
    this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, flipedPixels)
    for (let i = 0; i < length; i += row) {
      pixels.set(flipedPixels.subarray(i, i + row), end - i)
    }
    return pixels
  }
}

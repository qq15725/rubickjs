import { WebGLBlendMode } from './WebGLBlendMode'

export interface WebGLState {
  blend: boolean
  offsets: boolean
  culling: boolean
  depthTest: boolean
  clockwiseFrontFace: boolean
  depthMask: boolean
}

export class WebGLState {
  static readonly _properties = [
    'blend',
    'offsets',
    'culling',
    'depthTest',
    'clockwiseFrontFace',
    'depthMask',
  ]

  static _init() {
    this._properties.forEach((prop, index) => {
      Object.defineProperty(this.prototype, prop, {
        get() {
          return !!(this.bitmap & (1 << index))
        },
        set(value: boolean) {
          if (!!(this.bitmap & (1 << index)) !== value) {
            this.bitmap ^= (1 << index)
          }
        },
        enumerable: true,
        configurable: true,
      })
    })
  }

  static for2D(): WebGLState {
    const state = new WebGLState()
    state.depthTest = false
    state.blend = true
    return state
  }

  protected _blendMode = WebGLBlendMode.NORMAL
  protected _polygonOffset = 0

  bitmap = 0

  get blendMode(): WebGLBlendMode { return this._blendMode }
  set blendMode(value: WebGLBlendMode) {
    this.blend = (value !== WebGLBlendMode.NONE)
    this._blendMode = value
  }

  get polygonOffset(): number { return this._polygonOffset }
  set polygonOffset(value: number) {
    this.offsets = !!value
    this._polygonOffset = value
  }

  constructor(
    options?: {
      blend?: boolean
      offsets?: boolean
      culling?: boolean
      depthTest?: boolean
      clockwiseFrontFace?: boolean
      depthMask?: boolean
    },
  ) {
    if (options) {
      for (const key in options) {
        (this as any)[key] = (options as any)[key]
      }
    }
  }
}

WebGLState._init()

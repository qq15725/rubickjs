import { WebGLModule } from './WebGLModule'
import { WebGLState } from './WebGLState'
import { WebGLBlendMode, mapWebGLBlendModes } from './WebGLBlendMode'

export class WebGLStateModule extends WebGLModule {
  protected _blendEq = false
  protected _setters = WebGLState._properties.map(prop => {
    return (this as any)[`set${ prop.replace(/^\S/, s => s.toUpperCase()) }`]
  })

  boundStateBitmap = 0
  boundBlendMode?: string
  blendModes!: Record<WebGLBlendMode, any>
  defaultState = new WebGLState({ blend: true })

  override onUpdateContext() {
    super.onUpdateContext()
    this.blendModes = mapWebGLBlendModes(this._renderer.gl)
  }

  toggle(boundPoint: number, enable: boolean) { this._renderer.gl[enable ? 'enable' : 'disable'](boundPoint) }
  setBlend(value: boolean): void { this.toggle(this._renderer.gl.BLEND, value) }
  setOffsets(value: boolean): void { this.toggle(this._renderer.gl.POLYGON_OFFSET_FILL, value) }
  setCulling(value: boolean): void { this.toggle(this._renderer.gl.CULL_FACE, value) }
  setDepthTest(value: boolean): void { this.toggle(this._renderer.gl.DEPTH_TEST, value) }
  setDepthMask(value: boolean): void { this._renderer.gl.depthMask(value) }
  setClockwiseFrontFace(value: boolean) {
    const gl = this._renderer.gl
    gl.frontFace(gl[value ? 'CW' : 'CCW'])
  }

  setBlendMode(value: WebGLBlendMode): void {
    if (value === this.boundBlendMode) {
      return
    }

    this.boundBlendMode = value

    const mode = this.blendModes[value]
    const gl = this._renderer.gl

    if (mode.length === 2) {
      gl.blendFunc(mode[0], mode[1])
    } else {
      gl.blendFuncSeparate(mode[0], mode[1], mode[2], mode[3])
    }
    if (mode.length === 6) {
      this._blendEq = true
      gl.blendEquationSeparate(mode[4], mode[5])
    } else if (this._blendEq) {
      this._blendEq = false
      gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD)
    }
  }

  setPolygonOffset(value: number, scale: number): void { this._renderer.gl.polygonOffset(value, scale) }

  bind(state: WebGLState): void {
    if (this.boundStateBitmap !== state.bitmap) {
      let diff = this.boundStateBitmap ^ state.bitmap
      let i = 0
      while (diff) {
        if (diff & 1) {
          this._setters[i]?.call(this, !!(state.bitmap & (1 << i)))
        }
        diff = diff >> 1
        i++
      }
      this.boundStateBitmap = state.bitmap
    }

    state.blend && this.setBlendMode(state.blendMode)
    state.offsets && this.setPolygonOffset(1, state.polygonOffset)
  }

  reset(): void {
    super.reset()

    const gl = this._renderer.gl
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    this.bind(this.defaultState)
    this._blendEq = true
    this.setBlendMode(WebGLBlendMode.NORMAL)
  }
}

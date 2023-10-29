import { WebGLModule } from './WebGLModule'
import type { Renderable } from './types'

export type MaskColor = number

export interface MaskRect {
  x: number
  y: number
  width: number
  height: number
}

export type MaskObject = Renderable

export type Maskable =
  | MaskColor
  | MaskRect
  | MaskObject

export interface MaskData {
  source: Renderable
  mask: Maskable
  // color
  color?: number
  preComputedColor?: number
  // scissor
  scissorCounter?: number
  // scissorRect?: Rectangle
  // stencil
  stencilCounter?: number
}

export class WebGLMaskModule extends WebGLModule {
  stack: Array<MaskData> = []

  get length() { return this.stack.length }
  get last() { return this.stack[this.length - 1] }

  push(source: Renderable, mask: Maskable) {
    const data = { source, mask }

    this.stack.push(data)

    if (typeof data.mask === 'number') {
      this.pushColorMask(data)
    } else if ('render' in data.mask) {
      this._renderer.stencil.push(data)
    } else {
      this._renderer.scissor.push(data)
    }
  }

  pop(source: Renderable) {
    const data = this.stack.pop()

    if (!data || data.source !== source) {
      return
    }

    if (typeof data.mask === 'number') {
      this.popColorMask(data)
    } else if ('render' in data.mask) {
      this._renderer.stencil.pop(data)
    } else {
      this._renderer.scissor.pop(data)
    }
  }

  pushColorMask(data: MaskData): void {
    const curr = data.preComputedColor ?? 0xF
    const next = data.preComputedColor = curr & (data.mask as MaskColor)
    if (next !== curr) {
      this.useColorMask(next)
    }
  }

  popColorMask(data: MaskData): void {
    const curr = data.preComputedColor ?? 0xF
    const next = this.length > 0
      ? (this.last.preComputedColor ?? 0xF)
      : 0xF
    if (next !== curr) {
      this.useColorMask(next)
    }
  }

  useColorMask(value: number) {
    this._renderer.gl.colorMask(
      (value & 0x1) !== 0,
      (value & 0x2) !== 0,
      (value & 0x4) !== 0,
      (value & 0x8) !== 0,
    )
  }
}

import type { Node } from './Node'
import type { WebGLRenderer } from '@rubickjs/renderer'

export interface RenderCall {
  renderable: Node
  fn: (renderer: WebGLRenderer, next: () => void) => void
  calls: Array<RenderCall>
}

export class RenderStack {
  currentCall?: RenderCall
  calls: Array<RenderCall> = []

  push(renderable: Node): RenderCall {
    const currentCall = this.currentCall

    const calls = currentCall
      ? currentCall.calls
      : this.calls

    const call = {
      renderable,
      fn: renderable.render.bind(renderable),
      calls: [],
    }

    calls.push(call)

    return call
  }

  render(renderer: WebGLRenderer) {
    this.calls.forEach(function render(call: RenderCall) {
      call.fn(renderer, () => {
        call.calls.forEach(render)
      })
    })
    this.calls = []
  }
}

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

  compose(fns: Array<RenderCall['fn']>) {
    return <RenderCall['fn']> function (renderer, next) {
      let index = -1
      ;(function dispatch(i: number): Promise<void> {
        if (i <= index) return Promise.reject(new Error('next() called multiple times'))
        index = i
        let fn = fns[i]
        if (i === fns.length) fn = next
        if (!fn) return Promise.resolve()
        try {
          return Promise.resolve(fn(renderer, dispatch.bind(null, i + 1)))
        } catch (err) {
          return Promise.reject(err)
        }
      })(0)
    }
  }

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

    if (currentCall) {
      currentCall.fn = this.compose([
        currentCall.renderable.render.bind(currentCall.renderable),
        ...calls.map(call => call.fn),
      ])
    }

    return call
  }

  render(renderer: WebGLRenderer) {
    const call = this.compose(this.calls.map(call => call.fn))
    this.calls = []
    call(renderer, () => {
      //
    })
  }
}

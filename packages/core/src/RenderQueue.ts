import { BaseObject } from './BaseObject'
import type { Node } from './Node'
import type { WebGLRenderer } from '@rubickjs/renderer'

export class RenderQueue<T extends Node = Node> extends BaseObject {
  protected _renderables: Array<T> = []

  emitPushing(renderable: T) {
    this.emit('pushing', renderable)
  }

  emitPushed(renderable: T) {
    this.emit('pushed', renderable)
  }

  push(renderable: T, emitPushed = true) {
    this.emitPushing(renderable)
    this._renderables.push(renderable)
    emitPushed && this.emitPushed(renderable)
  }

  handle(renderer: WebGLRenderer) {
    let renderable: T | undefined
    // eslint-disable-next-line no-cond-assign
    while (renderable = this._renderables.shift()) {
      if (renderable.needsRender()) {
        renderable.render(renderer)
      }
    }
  }
}

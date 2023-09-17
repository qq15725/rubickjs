import { Resource } from './Resource'
import type { Node } from './Node'
import type { WebGLRenderer } from '../renderer'

export class RenderQueue<T extends Node = Node> extends Resource {
  protected _renderables: Array<T> = []

  push(renderable: T, index?: number, emitEnd = true) {
    this.emit('pushStart', renderable, this)
    if (index === undefined) {
      this._renderables.push(renderable)
    } else {
      this._renderables.splice(index, 0, renderable)
    }
    emitEnd && this.pushEnd(renderable)
  }

  pushEnd(renderable: T) {
    this.emit('pushEnd', renderable, this)
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

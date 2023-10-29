import { CanvasRenderingContext2D } from './CanvasRenderingContext2D'

export class Canvas {
  protected static _context2D?: CanvasRenderingContext2D
  static getContext(type: '2d'): CanvasRenderingContext2D {
    switch (type) {
      case '2d':
      default:
        return this._context2D ?? new CanvasRenderingContext2D()
    }
  }
}

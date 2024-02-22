interface RotatedBoundingBox {
  left: number
  top: number
  width: number
  height: number
  rotate: number
}

interface Point {
  x: number
  y: number
}

export type Anchor =
  | 'rotate-top-left'
  | 'rotate-top-right'
  | 'rotate-bottom-left'
  | 'rotate-bottom-right'
  | 'resize-top'
  | 'resize-right'
  | 'resize-bottom'
  | 'resize-left'
  | 'resize-top-left'
  | 'resize-top-right'
  | 'resize-bottom-left'
  | 'resize-bottom-right'

function createSvg(
  type: 'rotate' | 'resize' | 'resize2',
  rotation: number,
) {
  let path: string
  switch (type) {
    case 'rotate':
      path = '<path d="M22.4789 9.45728L25.9935 12.9942L22.4789 16.5283V14.1032C18.126 14.1502 14.6071 17.6737 14.5675 22.0283H17.05L13.513 25.543L9.97889 22.0283H12.5674C12.6071 16.5691 17.0214 12.1503 22.4789 12.1031L22.4789 9.45728Z" fill="black"/><path fill-rule="evenodd" clip-rule="evenodd" d="M21.4789 7.03223L27.4035 12.9945L21.4789 18.9521V15.1868C18.4798 15.6549 16.1113 18.0273 15.649 21.0284H19.475L13.5128 26.953L7.55519 21.0284H11.6189C12.1243 15.8155 16.2679 11.6677 21.4789 11.1559L21.4789 7.03223ZM22.4789 12.1031C17.0214 12.1503 12.6071 16.5691 12.5674 22.0284H9.97889L13.513 25.543L17.05 22.0284H14.5675C14.5705 21.6896 14.5947 21.3558 14.6386 21.0284C15.1157 17.4741 17.9266 14.6592 21.4789 14.1761C21.8063 14.1316 22.1401 14.1069 22.4789 14.1032V16.5284L25.9935 12.9942L22.4789 9.45729L22.4789 12.1031Z" fill="white"/>'
      break
    case 'resize':
      path = '<path d="m9 17.9907v.005l5.997 5.996.001-3.999h1.999 2.02v4l5.98-6.001-5.98-5.999.001 4.019-2.021.002h-2l.001-4.022zm1.411.003 3.587-3.588-.001 2.587h3.5 2.521v-2.585l3.565 3.586-3.564 3.585-.001-2.585h-2.521l-3.499-.001-.001 2.586z" fill="white"/><path d="m17.4971 18.9932h2.521v2.586l3.565-3.586-3.565-3.585v2.605h-2.521-3.5v-2.607l-3.586 3.587 3.586 3.586v-2.587z" fill="black"/>'
      break
    case 'resize2':
      path = '<path d="m19.7432 17.0869-4.072 4.068 2.829 2.828-8.473-.013-.013-8.47 2.841 2.842 4.075-4.068 1.414-1.415-2.844-2.842h8.486v8.484l-2.83-2.827z" fill="white"/><path d="m18.6826 16.7334-4.427 4.424 1.828 1.828-5.056-.016-.014-5.054 1.842 1.841 4.428-4.422 2.474-2.475-1.844-1.843h5.073v5.071l-1.83-1.828z" fill="black"/>'
      break
  }
  return `<svg height="32" width="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><filter id="shadow" color-interpolation-filters="sRGB"><feDropShadow dx="1" dy="1" stdDeviation="1.2" flood-opacity=".5"/></filter></defs><g fill="none" transform="rotate(${ rotation } 16 16)" filter="url(%23shadow)">${ path }</g></svg>`
    .replace(/"/g, '\'')
}

export class DnD {
  static get cursors() {
    return {
      'rotate-top-left': (rotate: number) => createSvg('rotate', 360 + rotate),
      'rotate-top-right': (rotate: number) => createSvg('rotate', 90 + rotate),
      'rotate-bottom-left': (rotate: number) => createSvg('rotate', 270 + rotate),
      'rotate-bottom-right': (rotate: number) => createSvg('rotate', 180 + rotate),
      'resize-left': (rotate: number) => createSvg('resize', 180 + rotate),
      'resize-top': (rotate: number) => createSvg('resize', 90 + rotate),
      'resize-right': (rotate: number) => createSvg('resize', 180 + rotate),
      'resize-bottom': (rotate: number) => createSvg('resize', 90 + rotate),
      'resize-top-left': (rotate: number) => createSvg('resize2', 90 + rotate),
      'resize-top-right': (rotate: number) => createSvg('resize2', 180 + rotate),
      'resize-bottom-right': (rotate: number) => createSvg('resize2', 90 + rotate),
      'resize-bottom-left': (rotate: number) => createSvg('resize2', 180 + rotate),
    }
  }

  anchor?: Anchor
  startBox?: RotatedBoundingBox
  startPoint?: Point
  centerPoint?: Point
  symmetricPoint?: Point
  movePoint?: Point
  rotationBefore?: number

  get isMove() { return !this.anchor }
  get isRotation() { return this.anchor?.startsWith('rotate') }
  get isHorizontal() { return this.anchor === 'resize-left' || this.anchor === 'resize-right' }
  get isHorizontalVertical() { return this.anchor?.split('-').length === 2 }

  install(engine: any): void {
    engine.on('pointerdown', this.onPointerdown)
    engine.on('pointermove', this.onPointermove)
    engine.on('pointerup', this.onPointerup)
  }

  onPointerdown = (e: PointerEvent) => {
    const target = e.target as any
    if (!target || !target.draggable) return
    this.start(target.style)
  }

  onPointermove = (e: PointerEvent) => { this.move({ x: e.clientX, y: e.clientY }) }
  onPointerup = (_e: PointerEvent) => { this.end() }

  protected _getRotatedPoint(point: Point, origin: Point, angle: number): Point {
    const radian = angle * Math.PI / 180
    return {
      x: (point.x - origin.x) * Math.cos(radian) - (point.y - origin.y) * Math.sin(radian) + origin.x,
      y: (point.x - origin.x) * Math.sin(radian) + (point.y - origin.y) * Math.cos(radian) + origin.y,
    }
  }

  protected _getCenterPoint(p1: Point, p2: Point): Point {
    return {
      x: (p2.x + p1.x) / 2,
      y: (p2.y + p1.y) / 2,
    }
  }

  protected _getHypotenuse(p1: Point, p2: Point): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
  }

  protected _getAnchors(box: RotatedBoundingBox) {
    const { width, height } = box
    const size = 6
    const sizeHalf = size / 2
    const size1 = size * 1.5
    const size1Half = size1 / 2
    const size2 = size * 2
    const anchors = {
      'resize-top': { x: size1Half, y: -sizeHalf, width: width - size1, height: size },
      'resize-right': { x: width - sizeHalf, y: size1Half, width: size, height: height - size1 },
      'resize-bottom': { x: size1Half, y: height - sizeHalf, width: width - size1, height: size },
      'resize-left': { x: -sizeHalf, y: size1Half, width: size, height: height - size1 },
      'resize-top-left': { x: -size1Half, y: -size1Half, width: size1, height: size1 },
      'resize-top-right': { x: width - size1Half, y: -size1Half, width: size1, height: size1 },
      'resize-bottom-left': { x: -size1Half, y: height - size1Half, width: size1, height: size1 },
      'resize-bottom-right': { x: width - size1Half, y: height - size1Half, width: size1, height: size1 },
      'rotate-top-left': { x: -size2 - size1Half, y: -size2 - size1Half, width: size2, height: size2 },
      'rotate-top-right': { x: width + size1Half, y: -size2 - size1Half, width: size2, height: size2 },
      'rotate-bottom-left': { x: -size2 - size1Half, y: height + size1Half, width: size2, height: size2 },
      'rotate-bottom-right': { x: width + size1Half, y: height + size1Half, width: size2, height: size2 },
    }
    for (const key in anchors) {
      const anchor = (anchors as any)[key]
      anchor.width = Math.max(anchor.width, 0)
      anchor.height = Math.max(anchor.height, 0)
    }
    return anchors
  }

  start(box: RotatedBoundingBox = { left: 0, top: 0, width: 0, height: 0, rotate: 0 }, anchor?: Anchor) {
    this.anchor = anchor
    this.startBox = box
    const { left, top, width, height, rotate } = box
    const anchorBox = anchor ? this._getAnchors(box)[anchor] : { x: 0, y: 0, width: 0, height: 0 }

    const startPointBefore = {
      x: left + anchorBox.x + anchorBox.width / 2,
      y: top + anchorBox.y + anchorBox.height / 2,
    }

    this.centerPoint = {
      x: left + width / 2,
      y: top + height / 2,
    }

    this.startPoint = this._getRotatedPoint(
      startPointBefore,
      this.centerPoint,
      this.isMove ? 0 : rotate,
    )

    this.symmetricPoint = {
      x: this.centerPoint.x * 2 - this.startPoint.x,
      y: this.centerPoint.y * 2 - this.startPoint.y,
    }

    this.rotationBefore = Math.atan2(
      this.startPoint.y - this.centerPoint.y,
      this.startPoint.x - this.centerPoint.x,
    ) / (Math.PI / 180)

    this.movePoint = undefined
  }

  move(point: Point) {
    const {
      startBox,
      startPoint,
      centerPoint,
      symmetricPoint,
      rotationBefore,
    } = this

    if (
      !startBox
      || !startPoint
      || !centerPoint
      || !symmetricPoint
      || !rotationBefore
    ) return

    this.movePoint ??= { ...point }

    const { movePoint } = this
    const { width, height, rotate } = startBox

    const box = {} as RotatedBoundingBox

    const offsetPoint = {
      x: point.x - movePoint.x,
      y: point.y - movePoint.y,
    }

    const cursorPoint = {
      x: startPoint.x + offsetPoint.x,
      y: startPoint.y + offsetPoint.y,
    }

    if (this.isMove) {
      box.left = cursorPoint.x
      box.top = cursorPoint.y
    } else if (this.isRotation) {
      const rotationAfter = Math.atan2(
        cursorPoint.y - centerPoint.y,
        cursorPoint.x - centerPoint.x,
      ) / (Math.PI / 180)
      box.rotate = rotate + rotationAfter - rotationBefore
    } else if (this.isHorizontalVertical) {
      const isHorizontal = this.isHorizontal
      const rotationBefore = this._getRotatedPoint(cursorPoint, startPoint, -rotate)
      const rotationAfter = this._getRotatedPoint(
        isHorizontal
          ? { x: rotationBefore.x, y: startPoint.y }
          : { x: startPoint.x, y: rotationBefore.y },
        startPoint,
        rotate,
      )
      const newCenterPoint = {
        x: rotationAfter.x - (rotationAfter.x - symmetricPoint.x) / 2,
        y: rotationAfter.y + (symmetricPoint.y - rotationAfter.y) / 2,
      }
      const hypotenuse = this._getHypotenuse(rotationAfter, symmetricPoint)
      if (isHorizontal) {
        box.width = hypotenuse
      } else {
        box.height = hypotenuse
      }
      box.left = newCenterPoint.x - ((isHorizontal ? hypotenuse : width) / 2)
      box.top = newCenterPoint.y - ((isHorizontal ? height : hypotenuse) / 2)
    } else {
      const newCenterPoint = this._getCenterPoint(cursorPoint, symmetricPoint)
      const points = [
        this._getRotatedPoint(cursorPoint, newCenterPoint, -rotate),
        this._getRotatedPoint(symmetricPoint, newCenterPoint, -rotate),
      ]
      const [minX, maxX] = points[0].x > points[1].x
        ? [points[1].x, points[0].x]
        : [points[0].x, points[1].x]
      const [minY, maxY] = points[0].y > points[1].y
        ? [points[1].y, points[0].y]
        : [points[0].y, points[1].y]
      box.width = maxX - minX
      box.height = maxY - minY
      box.left = minX
      box.top = minY
    }

    if (
      ('width' in box && box.width <= 0)
      || ('height' in box && box.height <= 0)
    ) return

    for (const key in box) {
      (this.startBox as any)[key] = (box as any)[key]
    }
  }

  end() {
    this.anchor = undefined
    this.startBox = undefined
    this.startPoint = undefined
    this.centerPoint = undefined
    this.symmetricPoint = undefined
    this.movePoint = undefined
    this.rotationBefore = undefined
  }
}

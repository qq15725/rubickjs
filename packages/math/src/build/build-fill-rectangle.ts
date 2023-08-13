export function buildFillRectangle(x: number, y: number, width: number, height: number) {
  return {
    vertices: [
      x, y,
      x + width, y,
      x, y + height,
      x + width, y + height,
    ],
    indices: [0, 1, 2, 1, 3, 2],
  }
}

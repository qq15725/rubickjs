export class Polygon {
  public points: number[] = []
  public closeStroke = false

  constructor(points: number[] = [], closeStroke = false) {
    this.points = points
    this.closeStroke = closeStroke
  }
}

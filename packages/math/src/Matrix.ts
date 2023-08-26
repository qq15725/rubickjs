import { Vector } from './Vector'

interface NumberArray {
  readonly length: number
  [n: number]: number
}

export type MatrixTarget = number | NumberArray
export type MatrixOutput = NumberArray

export abstract class Matrix extends Float64Array {
  constructor(
    readonly rows: number,
    readonly cols: number,
    array?: ArrayLike<number>,
  ) {
    super(rows * cols)

    if (array) {
      this.set(array)
    } else {
      this.identity()
    }
  }

  /**
   * Resets this Matrix to an identity (default) matrix.
   */
  identity(): this {
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        const iy = y * this.cols
        const i = x + iy
        this[i] = y + iy === i ? 1 : 0
      }
    }
    return this
  }

  protected _operate(
    operator: string,
    value: MatrixTarget | Vector,
    output?: MatrixOutput,
  ) {
    const { cols, rows } = this

    if (value instanceof Vector) {
      const { dim } = value
      const VectorClass = value.constructor as new () => Vector
      const result: Vector = output instanceof VectorClass
        ? output
        : new VectorClass()

      if (operator === '*') {
        for (let y = 0; y < dim; y++) {
          let sum = 0
          for (let i = 0; i < cols; i++) {
            if (i < dim) {
              sum += this[y * cols + i] * (value[i] ?? 0)
            }
          }
          result[y] = sum
        }
        return result
      } else {
        throw new Error(`Not support operator in '${ this.toName() } ${ operator } ${ value.toName() }'`)
      }
    } else {
      let result: any
      if (output === undefined || operator === '=') {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        result = this
      } else {
        result = output
      }

      const isNumber = typeof value === 'number'

      if (operator === '*') {
        for (let x = 0; x < cols; x++) {
          for (let y = 0; y < rows; y++) {
            const iy = y * cols
            let sum = 0
            for (let i = 0; i < rows; i++) {
              const a = iy + i
              const b = i * cols + x
              sum += (this[a] ?? 0) * (isNumber ? value : (value[b] ?? 0))
            }
            result[iy + x] = sum
          }
        }
      } else {
        throw new Error(`Not support operator in '${ this.toName() } ${ operator } Matrix2'`)
      }

      return result
    }
  }

  multiply<T extends Vector>(value: T): T
  multiply(value: MatrixTarget): this
  multiply<T extends MatrixOutput>(value: MatrixTarget, output: T): T
  multiply(value: any): any { return this._operate('*', value) }

  toArray(transpose = false): Array<number> {
    if (transpose) {
      const { cols, rows } = this
      const array: Array<number> = []
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          array[y + x * cols] = this[x + y * cols]
        }
      }
      return array
    }
    return [...this]
  }

  toName(): string {
    return `Matrix${ this.rows }(${ this.rows }x${ this.cols })`
  }
}

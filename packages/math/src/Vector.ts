import { Matrix } from './Matrix'

interface NumberArray {
  readonly length: number
  [n: number]: number
}

export type VectorTarget = number | NumberArray | Matrix
export type VectorOutput = NumberArray

export abstract class Vector extends Float64Array {
  protected _onUpdateCallback?: (...args: Array<number>) => void

  constructor(
    readonly dim: number,
  ) {
    super(dim)
  }

  onUpdate(callback: (...args: Array<number>) => void): this {
    this._onUpdateCallback = callback
    return this
  }

  protected _operate(
    operator: string,
    value: VectorTarget,
    output?: VectorOutput,
  ): any {
    const { dim } = this
    const result = output ?? this
    const target = typeof value === 'number'
      ? Array.from({ length: dim }, () => value)
      : value

    if (target instanceof Matrix) {
      if (operator === '*') {
        for (let x = 0; x < dim; x++) {
          let val = 0
          for (let y = 0; y < dim; y++) {
            val += this[x] * target[y * target.cols + x]
          }
          result[x] = val
        }
      } else {
        throw new Error(`Not support operator in '${ this.toName() } ${ operator } ${ target.toName() }'`)
      }
    } else {
      if (operator === '+') {
        for (let i = 0; i < dim; i++) {
          result[i] = this[i] + target[i]
        }
      } else if (operator === '-') {
        for (let i = 0; i < dim; i++) {
          result[i] = this[i] - target[i]
        }
      } else if (operator === '*') {
        for (let i = 0; i < dim; i++) {
          result[i] = this[i] * target[i]
        }
      } else if (operator === '/') {
        for (let i = 0; i < dim; i++) {
          result[i] = this[i] / target[i]
        }
      } else if (operator === '=') {
        for (let i = 0; i < dim; i++) {
          this[i] = target[i]
        }
        return this
      } else if (operator === 'rot') {
        const c = Math.cos(target[0])
        const s = Math.sin(target[0])
        result[0] = this[0] * c - this[1] * s
        result[1] = this[1] * c + this[0] * s
      } else if (operator === '==') {
        let flag = true
        for (let i = 0; i < dim; i++) {
          flag = flag && this[i] === target[i]
        }
        return flag
      } else {
        throw new Error(`Not support operator in '${ this.toName() } ${ operator } Vector'`)
      }
    }

    this._onUpdateCallback?.(...Array.from(result))

    return result
  }

  add(value: VectorTarget): this
  add<T extends VectorOutput>(value: VectorTarget, output: T): T
  add(value: any, output?: any): any { return this._operate('+', value, output) }

  sub(value: VectorTarget): this
  sub<T extends VectorOutput>(value: VectorTarget, output: T): T
  sub(value: any, output?: any): any { return this._operate('-', value, output) }

  multiply(value: VectorTarget): this
  multiply<T extends VectorOutput>(value: VectorTarget, output: T): T
  multiply(value: any, output?: any): any { return this._operate('*', value, output) }

  divide(value: VectorTarget): this
  divide<T extends VectorOutput>(value: VectorTarget, output: T): T
  divide(value: any, output?: any): any { return this._operate('/', value, output) }

  rotate(angle: number): this
  rotate<T extends VectorOutput>(angle: number, output: T): T
  rotate(angle: any): any { return this._operate('rot', angle) }

  copy(value: VectorTarget): this { return this._operate('=', value) }

  equals(value: VectorTarget): boolean { return this._operate('==', value) }

  toName(): string {
    return `Vector${ this.dim }`
  }

  clone(): this {
    const cloned = new (this.constructor as any)()
    cloned.set(this.toArray())
    return cloned
  }

  toArray(): Array<number> {
    return [...this]
  }
}

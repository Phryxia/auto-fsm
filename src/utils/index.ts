import * as math from 'mathjs'
import { Matrix } from 'mathjs'

// array(3) -> [0, 1, 2]
// array(1, 3) -> [1, 2]
// array(1, 5, 2) -> [1, 3]
export function array(arg0: number, arg1?: number, step?: number): number[] {
  const start = arg1 === undefined ? 0 : arg0
  const end = arg1 === undefined ? arg0 : arg1
  step = step ?? 1

  const length = Math.ceil((end - start) / step)
  const result: number[] = new Array(length)
  for (let n = start, i = 0; i < length; n += step, i += 1) {
    result[i] = n
  }
  return result
}

export function random(arg0: number, arg1?: number): number {
  const min = arg1 === undefined ? 0 : arg0
  const max = arg1 === undefined ? arg0 : arg1

  return Math.random() * (max - min) + min
}

export function lerp(u: Matrix, v: Matrix, scala: number): Matrix {
  return math.add(
    math.multiply(u, 1 - scala),
    math.multiply(v, scala)
  ) as Matrix
}

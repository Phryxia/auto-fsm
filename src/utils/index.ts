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

// random(x): [0, x]
// random(x, y): [x, y]
export function random(arg0: number, arg1?: number): number {
  const min = arg1 === undefined ? 0 : arg0
  const max = arg1 === undefined ? arg0 : arg1

  return Math.random() * (max - min) + min
}

// randomInt(x): [0, x)
// randomInt(x, y): [x, y)
export function randomInt(arg0: number, arg1?: number): number {
  const min = arg1 === undefined ? 0 : arg0
  const max = arg1 === undefined ? arg0 : arg1

  return Math.floor(random(min, max - 1e-10))
}

export function lerp(u: Matrix, v: Matrix, scala: number): Matrix {
  return math.add(
    math.multiply(u, 1 - scala),
    math.multiply(v, scala)
  ) as Matrix
}

export function argmin<T>(
  list: T[],
  predicate: (t: T) => number
): { element: T; score: number; index: number } {
  if (list.length === 0)
    throw Error('argmin of 0-length list cannot be determined')

  return list.reduce(
    (prev, element, index) => {
      if (index === 0) return prev

      const score = predicate(element)
      if (score < prev.score) {
        prev.element = element
        prev.score = score
        prev.index = index
      }
      return prev
    },
    { score: predicate(list[0]), element: list[0], index: 0 }
  )
}

export type MakeOptional<
  T,
  Keys extends string | number | symbol
> = Partial<T> & Omit<T, Keys>

export function quantize(x: number, accuracy: number): number {
  return Math.floor(x / accuracy) * accuracy
}

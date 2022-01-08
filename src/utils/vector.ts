import * as math from 'mathjs'
import { Matrix } from 'mathjs'

const MIN_THR = 1e-9

export function add(a: Matrix, b: Matrix): Matrix {
  return math.add(a, b) as Matrix
}

export function sub(a: Matrix, b: Matrix): Matrix {
  return math.subtract(a, b) as Matrix
}

export function mul(a: Matrix, b: Matrix | number): Matrix {
  return math.multiply(a, b) as Matrix
}

export function len(matrix: Matrix): number {
  return Math.sqrt(math.dot(matrix, matrix))
}

export function projRate(target: Matrix, base: Matrix): number {
  return math.dot(base, target) / math.dot(base, base)
}

export function proj(target: Matrix, base: Matrix): Matrix {
  return mul(base, projRate(target, base))
}

export function setLen(matrix: Matrix, length: number): Matrix {
  const size = Math.sqrt(math.dot(matrix, matrix))
  return size < 1e-8 ? math.matrix([0, 0]) : mul(matrix, length / size)
}

export function unit(rad: number): Matrix {
  return math.matrix([Math.cos(rad), Math.sin(rad)])
}

export function x(matrix: Matrix): number {
  return math.subset(matrix, math.index(0)) as unknown as number
}

export function y(matrix: Matrix): number {
  return math.subset(matrix, math.index(1)) as unknown as number
}

export function rotate(matrix: Matrix, rad: number): Matrix {
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  const _x = x(matrix)
  const _y = y(matrix)
  return math.matrix([c * _x - s * _y, s * _x + c * _y])
}

export function normalize(matrix: Matrix): Matrix {
  const size = Math.sqrt(math.dot(matrix, matrix))
  return size < MIN_THR ? math.matrix([0, 0]) : math.multiply(matrix, 1 / size)
}

export function decompose(target: Matrix, base: Matrix): [number, number] {
  if (len(base) < MIN_THR) return [0, 0]

  base = normalize(base)

  const u = proj(target, base)
  const v = sub(target, u)
  return [projRate(target, base), Math.sign(outer(base, v)) * len(v)]
}

export function outer(a: Matrix, b: Matrix): number {
  const xa = x(a)
  const ya = y(a)
  const xb = x(b)
  const yb = y(b)
  return xa * yb - xb * ya
}

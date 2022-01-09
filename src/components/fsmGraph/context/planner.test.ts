import * as math from 'mathjs'
import { isCrossed } from './planner'

describe('isCrossed', () => {
  test('not cross with not singular', () => {
    expect(
      isCrossed(
        {
          src: 0,
          dst: 1,
          pSrc: math.matrix([0, 0]),
          pDst: math.matrix([1, 1]),
          vSrc: math.matrix([1, 1]),
        },
        {
          src: 2,
          dst: 3,
          pSrc: math.matrix([-1, -1]),
          pDst: math.matrix([-1, -2]),
          vSrc: math.matrix([0, -1]),
        }
      )
    ).toBeFalsy()
  })

  test('not cross with singular', () => {
    expect(
      isCrossed(
        {
          src: 0,
          dst: 1,
          pSrc: math.matrix([0, 0]),
          pDst: math.matrix([1, 1]),
          vSrc: math.matrix([1, 1]),
        },
        {
          src: 2,
          dst: 3,
          pSrc: math.matrix([2, 2]),
          pDst: math.matrix([3, 3]),
          vSrc: math.matrix([1, 1]),
        }
      )
    ).toBeFalsy()
  })

  test('crossed', () => {
    expect(
      isCrossed(
        {
          src: 0,
          dst: 1,
          pSrc: math.matrix([0, 0]),
          pDst: math.matrix([1, 1]),
          vSrc: math.matrix([1, 1]),
        },
        {
          src: 2,
          dst: 3,
          pSrc: math.matrix([1, 0]),
          pDst: math.matrix([0, 1]),
          vSrc: math.matrix([-1, 1]),
        }
      )
    ).toBeTruthy()
  })

  test('overlaped', () => {
    expect(
      isCrossed(
        {
          src: 0,
          dst: 1,
          pSrc: math.matrix([0, 0]),
          pDst: math.matrix([0, 1]),
          vSrc: math.matrix([0, 1]),
        },
        {
          src: 0,
          dst: 2,
          pSrc: math.matrix([0, 0]),
          pDst: math.matrix([0, 2]),
          vSrc: math.matrix([0, 2]),
        }
      )
    ).toBeTruthy()
  })

  test('mid point connected', () => {
    expect(
      isCrossed(
        {
          src: 0,
          dst: 1,
          pSrc: math.matrix([0, 0]),
          pDst: math.matrix([0, 1]),
          vSrc: math.matrix([0, 1]),
        },
        {
          src: 1,
          dst: 2,
          pSrc: math.matrix([0, 0.5]),
          pDst: math.matrix([1, 0.5]),
          vSrc: math.matrix([1, 0]),
        }
      )
    ).toBeTruthy()
  })

  test('e2 is bigger than e1 and overlapped', () => {
    expect(
      isCrossed(
        {
          src: 0,
          dst: 1,
          pSrc: math.matrix([0, 0]),
          pDst: math.matrix([0, 1]),
          vSrc: math.matrix([0, 1]),
        },
        {
          src: 2,
          dst: 3,
          pSrc: math.matrix([0, -1]),
          pDst: math.matrix([0, 2]),
          vSrc: math.matrix([0, 3]),
        }
      )
    ).toBeTruthy()
  })
})

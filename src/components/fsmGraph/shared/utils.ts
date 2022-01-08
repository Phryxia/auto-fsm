import { lerp } from '@src/utils'
import * as V from '@src/utils/vector'
import { Matrix } from 'mathjs'
import { SIZE } from './consts'

// 중심 center에서 direction 방향에 해당하는 곳의 접속점을 반환
// 오토마타 원의 둘레에 위치한다.
export function getConnectPosition(center: Matrix, direction: Matrix): Matrix {
  return V.add(center, V.setLen(direction, SIZE / 2))
}

export function getSelfControlPosition(
  pCenter: Matrix,
  xOffset: number,
  yOffset: number
): Matrix {
  const ux = V.unit(Math.PI / 4)
  const uy = V.unit((Math.PI * 3) / 4)
  const vm0 = V.add(pCenter, V.setLen(ux, SIZE))

  return V.add(V.add(vm0, V.mul(ux, xOffset)), V.mul(uy, yOffset))
}

export function convertToSelfOffset(
  pCenter: Matrix,
  pTarget: Matrix
): { xOffset: number; yOffset: number } {
  const pCtrl = getSelfControlPosition(pCenter, 0, 0)
  const dCtrl = V.sub(pCtrl, pCenter)
  const diff = V.sub(pTarget, pCtrl)
  const [u, v] = V.decompose(diff, dCtrl)
  return {
    xOffset: u,
    yOffset: v,
  }
}

export function getControlPosition(
  pSrc: Matrix,
  pDst: Matrix,
  xOffset: number,
  yOffset: number
): Matrix {
  const pMid = lerp(pSrc, pDst, 0.5)
  const dMid = V.sub(pMid, pSrc)
  const uX = V.normalize(dMid)
  const uY = V.rotate(uX, Math.PI / 2)
  return V.add(V.add(pMid, V.mul(uX, xOffset)), V.mul(uY, yOffset))
}

export function converToOffset(
  pSrc: Matrix,
  pDst: Matrix,
  pTarget: Matrix
): { xOffset: number; yOffset: number } {
  const pCtrl = getControlPosition(pSrc, pDst, 0, 0)
  const dCtrl = V.sub(pCtrl, pSrc)
  const diff = V.sub(pTarget, pCtrl)
  const [u, v] = V.decompose(diff, dCtrl)
  return {
    xOffset: u,
    yOffset: v,
  }
}

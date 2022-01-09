import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useRef,
} from 'react'
import * as math from 'mathjs'
import { Matrix } from 'mathjs'
import { Charset, FiniteStateMachine, StateKey } from '@src/model'
import * as V from '@src/utils/vector'
import {
  getConnectPosition,
  getSelfControlPosition,
  convertToSelfOffset,
  getControlPosition,
  converToOffset,
} from '../shared'
import { FSMVisualState } from './types'
import { createVisualState } from './planner'

// @ts-ignore
export const FSMContext = createContext<{
  fsm: FiniteStateMachine
  getStatePosition(sid: StateKey): Matrix
  setStatePosition(sid: StateKey, x: number, y: number): void
  getEdgeDetail(
    sid: StateKey,
    char: Charset
  ): {
    controlPoint: Matrix
    spline: number[]
  }
  setControlPosition(sid: StateKey, char: Charset, x: number, y: number): void
  update: React.DispatchWithoutAction
}>()

export const FSMProvider = ({
  children,
  fsm,
}: {
  children: React.ReactNode
  fsm: FiniteStateMachine
}) => {
  const [, update] = useReducer(() => ({}), {})
  const stateRef = useRef<FSMVisualState>()

  if (!stateRef.current || stateRef.current.fsm.id !== fsm.id) {
    stateRef.current = createVisualState(fsm)
  }

  const getStatePosition = useCallback((sid: StateKey) => {
    return stateRef.current.statePositions[sid]
  }, [])

  const setStatePosition = useCallback(
    (sid: StateKey, x: number, y: number) => {
      stateRef.current.statePositions[sid] = math.matrix([x, y])
      update()
    },
    []
  )

  /*
    계산 알고리즘

    cs: 시작 중심
    ce: 끝 중심
    vd: cs -> ce로 향하는 벡터

    기본 미드값을 두 정점의 중심으로 잡음
    거기서 vd 방향으로 평행한 오프셋을 x, 수직한 오프셋을 y
  */
  const getEdgeDetail = useCallback((sid: StateKey, char: Charset) => {
    const sd = stateRef.current.fsm.transitions[sid][char]
    const { xOffset, yOffset } = stateRef.current.edgeProperties[sid][char]

    const cs = stateRef.current.statePositions[sid]
    const ce = stateRef.current.statePositions[sd]

    if (sid === sd) {
      return getEdgeDetailSelf(cs, xOffset, yOffset)
    }
    return getEdgeDetailOther(cs, ce, xOffset, yOffset)
  }, [])

  const setControlPosition = useCallback(
    (sid: StateKey, char: Charset, x: number, y: number) => {
      const sd = stateRef.current.fsm.transitions[sid][char]

      if (sd === sid) {
        stateRef.current.edgeProperties[sid][char] = convertToSelfOffset(
          stateRef.current.statePositions[sid],
          math.matrix([x, y])
        )
      } else {
        stateRef.current.edgeProperties[sid][char] = converToOffset(
          stateRef.current.statePositions[sid],
          stateRef.current.statePositions[sd],
          math.matrix([x, y])
        )
      }
      update()
    },
    []
  )

  return (
    <FSMContext.Provider
      value={{
        fsm,
        getStatePosition,
        setStatePosition,
        getEdgeDetail,
        setControlPosition,
        update,
      }}
    >
      {children}
    </FSMContext.Provider>
  )
}

export function useFSMVisual() {
  return useContext(FSMContext)
}

function getEdgeDetailSelf(
  pCenter: Matrix,
  xOffset: number,
  yOffset: number
): { controlPoint: Matrix; spline: number[] } {
  const vm = getSelfControlPosition(pCenter, xOffset, yOffset)
  const diff = V.sub(vm, pCenter)
  const un = V.normalize(V.rotate(diff, Math.PI / 2))

  const p0 = getConnectPosition(pCenter, diff)
  const v0m = V.mul(V.sub(vm, p0), 0.5) // control point와 시작점의 중점까지의 변화
  const pm = V.add(p0, v0m)
  const size = V.len(v0m)

  return {
    controlPoint: vm,
    spline: matricesToPoints([
      p0,
      V.add(pm, math.multiply(un, size)),
      vm,
      V.add(pm, math.multiply(un, -size)),
      p0,
    ]),
  }
}

function getEdgeDetailOther(
  pSrc: Matrix,
  pDst: Matrix,
  xOffset: number,
  yOffset: number
): { controlPoint: Matrix; spline: number[] } {
  const pCtrl = getControlPosition(pSrc, pDst, xOffset, yOffset)
  const dCtrl = V.sub(pCtrl, pSrc)
  const dCtrlR = V.sub(pCtrl, pDst)

  return {
    controlPoint: pCtrl,
    spline: matricesToPoints([
      getConnectPosition(pSrc, dCtrl),
      pCtrl,
      getConnectPosition(pDst, dCtrlR),
    ]),
  }
}

function matricesToPoints(matrices: Matrix[]): number[] {
  return matrices.reduce((acc, v) => {
    acc.push(V.x(v))
    acc.push(V.y(v))
    return acc
  }, [] as number[])
}

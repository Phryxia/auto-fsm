import * as V from '@src/utils/vector'
import { Matrix, random } from 'mathjs'
import * as math from 'mathjs'
import { Charset, CHAR_LIST, FiniteStateMachine, StateKey } from '@src/model'
import { argmin, array, MakeOptional } from '@src/utils'
import { CANVAS_HEIGHT, CANVAS_WIDTH, SIZE } from '../shared'
import { FSMVisualState } from './types'

interface Edge {
  src: StateKey
  dst: StateKey
  pSrc: Matrix
  pDst: Matrix
  vSrc: Matrix
}

// FSM은 유향그래프라 자신으로 들어오는 간선을 모른다
// 그런데 이 알고리즘은 자신으로 들어오는 입력도 알아야 하므로, 사전에 캐시해둔다
// 초기 좌표는 0벡터이다.
function createEdgeMap(
  fsm: FiniteStateMachine
): MakeOptional<Edge, 'pSrc' | 'pDst' | 'vSrc'>[][] {
  const result: MakeOptional<Edge, 'pSrc' | 'pDst' | 'vSrc'>[][] = array(
    fsm.numOfStates
  ).map(() => [])

  result.forEach((_, src: StateKey) => {
    CHAR_LIST.forEach((char) => {
      const dst = fsm.transitions[src][char]
      const edge: MakeOptional<Edge, 'pSrc' | 'pDst' | 'vSrc'> = {
        src,
        dst,
        pSrc: undefined,
        pDst: undefined,
        vSrc: undefined,
      }
      result[src][dst] = edge
      if (src !== dst) {
        result[dst][src] = edge
      }
    })
  })

  return result
}

// pSrc + t * vSrc = pTarget을 푼다
function solveLineEquation(
  pSrc: Matrix,
  vSrc: Matrix,
  pTarget: Matrix
): number | undefined {
  const t1 = (V.x(pTarget) - V.x(pSrc)) / V.x(vSrc)
  const t2 = (V.y(pTarget) - V.y(pSrc)) / V.y(vSrc)

  // 해 없음 (불능)
  if (Number.isNaN(t1) || Number.isNaN(t2) || Math.abs(t1 - t2) > 1e-10)
    return undefined

  return t1
}

// 벡터 방정식을 풀어서 교점을 찾는다
// e1.pSrc + tx * e1.vSrc = e2.pSrc + ty * e2.vSrc
function isCrossed(e1: Edge, e2: Edge): boolean {
  const directionMatrix = math.matrix([
    [V.x(e1.vSrc), -V.x(e2.vSrc)],
    [V.y(e1.vSrc), -V.y(e2.vSrc)],
  ])
  const constant = V.sub(e2.pSrc, e1.pSrc)

  // 평행
  if (Math.abs(math.det(directionMatrix)) === 0) {
    const tSrc = solveLineEquation(e1.pSrc, e1.vSrc, e2.pSrc)
    const tDst = solveLineEquation(e1.pSrc, e1.vSrc, e2.pDst)

    if (tSrc === undefined || tDst === undefined) return false

    // 일치하면서 겹치는 경우
    return tSrc * tDst < 0
  }

  // 교점 계산
  const t = V.mul(math.inv(directionMatrix), constant)
  const tx = V.x(t)
  const ty = V.y(t)

  // 교점이 선분 내에 있는지
  return 0 < tx && tx < 1 && 0 < ty && ty < 1
}

function createFeasiblePositions(numOfPositions: number): Matrix[] {
  return array(numOfPositions).map(() =>
    math.matrix([
      random(SIZE, CANVAS_WIDTH - SIZE),
      random(SIZE, CANVAS_HEIGHT - SIZE),
    ])
  )
}

// 정점들을 한 개씩 간선이 가장 덜 겹치는 지점으로 찍는다
function computeStatePositions(fsm: FiniteStateMachine): Matrix[] {
  const positions: Matrix[] = []
  const stack: StateKey[] = array(fsm.numOfStates)
  const edgeMap = createEdgeMap(fsm)
  const connectedStates: StateKey[] = []
  const connectedEdges: Edge[] = []

  // 정점 state의 위치를 확정한다
  function updatePosition(state: StateKey, position: Matrix): void {
    edgeMap[state].forEach((connectedEdge) => {
      // state에서 나가는 간선인 경우
      if (connectedEdge.src === state) {
        connectedEdge.pSrc = position
      }
      // state로 들어오는 간선의 경우
      else {
        connectedEdge.pDst = position
      }

      // 두 지점이 모두 결정된 경우 정식 연결로 승격
      if (connectedEdge.pSrc && connectedEdge.pDst) {
        connectedEdge.vSrc = V.sub(connectedEdge.pDst, connectedEdge.pSrc)
        connectedEdges.push(connectedEdge as Edge)
      }
    })
    positions[state] = position
  }

  // DFS
  while (stack.length > 0) {
    // 새로 연결할 정점 뽑기
    const currentState = stack.pop()
    if (positions[currentState]) continue

    // 2개까지는 아무데나 연결
    let selectedSample: Matrix
    if (connectedStates.length < 2) {
      selectedSample = createFeasiblePositions(1)[0]
    } else {
      const samples = createFeasiblePositions(200)
      const neighbors = edgeMap[currentState]
        .map((edge) => {
          if (edge.src === currentState) return edge.dst
          return edge.src
        })
        .filter((neighbor) => !!positions[neighbor])

      // 각 샘플에 대하여, 그 샘플로부터 연결되어야 하는 간선이
      // 기존 간선과 얼마나 겹치는지를 계산
      // 또한 너무 기존 정점과 가까운지도 반영
      selectedSample = argmin(samples, (sample) => {
        let crossCount = 0

        neighbors.forEach((neighbor) => {
          const virtualEdge = {
            src: neighbor,
            dst: currentState,
            pSrc: sample,
            pDst: positions[neighbor],
            vSrc: V.sub(positions[neighbor], sample),
          }

          connectedEdges.forEach((existedEdge) => {
            if (isCrossed(virtualEdge, existedEdge)) {
              crossCount += 1
            }
          })
        })

        const minDist = positions.reduce(
          (minDist, position) =>
            Math.min(minDist, V.len(V.sub(sample, position))),
          1e10
        )

        return (
          crossCount +
          (1 - minDist / Math.sqrt(CANVAS_WIDTH ** 2 + CANVAS_HEIGHT ** 2))
        )
      }).element
    }

    // 결정된 위치 반영
    updatePosition(currentState, selectedSample)
    connectedStates.push(currentState)

    // 이웃으로 DFS 진행
    CHAR_LIST.forEach((char) => {
      const neighborState = fsm.transitions[currentState][char]
      if (!positions[neighborState]) stack.push(neighborState)
    })
  }

  return positions
}

export function createVisualState(fsm: FiniteStateMachine): FSMVisualState {
  const states = array(fsm.numOfStates)

  const statePositions = computeStatePositions(fsm)

  const edgeProperties = states.map((src: StateKey) => {
    const result: Partial<
      Record<Charset, { xOffset: number; yOffset: number }>
    > = {}

    // 동일 목적지로 가는 것들
    const charHavingDst: Charset[][] = []

    CHAR_LIST.forEach((char: Charset) => {
      const dst = fsm.transitions[src][char]

      // 상호참조인 경우
      if (
        CHAR_LIST.some(
          (charFromNeighbor) => fsm.transitions[dst][charFromNeighbor] === src
        )
      ) {
        result[char] = {
          xOffset: 0,
          yOffset: SIZE / 4,
        }
      } else {
        result[char] = {
          xOffset: 0,
          yOffset: 0,
        }
      }

      // 동일목적지 등록용
      if (!charHavingDst[dst]) {
        charHavingDst[dst] = []
      }
      charHavingDst[dst].push(char)
    })

    // 동일 목적지로 가는 것들도 간격을 벌려놓는다
    charHavingDst.forEach((family) => {
      if (family.length < 2) return
      family.forEach((char, index) => {
        // 자기 자신으로 가는 것이 여러 개인 경우
        if (fsm.transitions[src][char] === src) {
          result[char] = {
            xOffset: (Math.cos((index * Math.PI) / 4) - 1) * SIZE,
            yOffset: Math.sin((index * Math.PI) / 4) * SIZE,
          }
        } else {
          result[char] = {
            xOffset: 0,
            yOffset:
              (SIZE / 4) * Math.cos((index / (family.length - 1)) * Math.PI),
          }
        }
      })
    })

    return result as Record<Charset, { xOffset: number; yOffset: number }>
  })

  return {
    fsm,
    statePositions,
    edgeProperties,
  }
}

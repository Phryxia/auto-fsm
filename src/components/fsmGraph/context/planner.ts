import * as V from '@src/utils/vector'
import { Matrix, random } from 'mathjs'
import * as math from 'mathjs'
import { Charset, CHAR_LIST, FiniteStateMachine, StateKey } from '@src/model'
import { argmin, array, MakeOptional, quantize } from '@src/utils'
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
// 없으면 undefiend 반환
function solveLineEquation(
  pSrc: Matrix,
  vSrc: Matrix,
  pTarget: Matrix
): number | undefined {
  const t1 = (V.x(pTarget) - V.x(pSrc)) / V.x(vSrc)
  const t2 = (V.y(pTarget) - V.y(pSrc)) / V.y(vSrc)

  // vSrc가 0벡터, 즉 점과 점만 준 경우.. 간선이 정상적으로 들어왔다면
  // 이 경우가 생기지 않아야 한다.
  if (Number.isNaN(t1) && Number.isNaN(t2)) {
    if (V.len(V.sub(pTarget, pSrc)) < 1e-10) return 0
    return undefined
  }

  // vSrc.x가 0인 경우
  if (Number.isNaN(t1)) {
    if (Math.abs(V.x(pTarget) - V.x(pSrc)) < 1e-10) return t2
    return undefined
  }

  // vSrc.y가 0인 경우
  if (Number.isNaN(t2)) {
    if (Math.abs(V.y(pTarget) - V.y(pSrc)) < 1e-10) return t1
    return undefined
  }

  if (Math.abs(t1 - t2) < 1e-10) return t1
  return undefined
}

// 벡터 방정식을 풀어서 교점을 찾는다
// e1.pSrc + tx * e1.vSrc = e2.pSrc + ty * e2.vSrc
export function isCrossed(e1: Edge, e2: Edge): boolean {
  const directionMatrix = math.matrix([
    [V.x(e1.vSrc), -V.x(e2.vSrc)],
    [V.y(e1.vSrc), -V.y(e2.vSrc)],
  ])
  const constant = V.sub(e2.pSrc, e1.pSrc)

  // 평행 or 일직선
  if (Math.abs(math.det(directionMatrix)) < 1e-10) {
    let tSrc = solveLineEquation(e1.pSrc, e1.vSrc, e2.pSrc)
    let tDst = solveLineEquation(e1.pSrc, e1.vSrc, e2.pDst)

    ;[tSrc, tDst] = [Math.min(tSrc, tDst), Math.max(tSrc, tDst)]

    // 평행
    if (tSrc === undefined || tDst === undefined) return false

    // 일직선 상에 있는 경우
    if (tSrc <= 0) {
      return tDst > 0
    }
    return tSrc < 1
  }

  // 교점 계산
  const t = V.mul(math.inv(directionMatrix), constant)
  const tx = V.x(t)
  const ty = V.y(t)

  // 교점이 선분 내에 있는지
  // 만약 한 점은 선분 내에 있을 경우 겹친걸로 간주함
  if (tx === 0 || tx === 1) {
    return 0 < ty && ty < 1
  }
  if (ty === 0 || ty === 1) {
    return 0 < tx && tx < 1
  }
  return 0 < tx && tx < 1 && 0 < ty && ty < 1
}

function createFeasiblePositions(pCenter: Matrix): Matrix[] {
  const period = 8
  const orbit = 4
  return array(orbit)
    .map((oIndex) => {
      return array(period).map((pIndex) => {
        const u = V.unit((pIndex * Math.PI * 2) / period)
        return V.add(V.mul(u, (oIndex + 1) * 2 * SIZE), pCenter)
      })
    })
    .flat()
}

function postProcessForPositions(positions: Matrix[]): Matrix[] {
  if (positions.length === 1)
    return [math.matrix([CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2])]

  positions = positions.map((position) => math.floor(position))

  let minX = 1e10
  let minY = 1e10
  let maxX = -1e10
  let maxY = -1e10
  positions.forEach((position) => {
    minX = Math.min(minX, V.x(position))
    minY = Math.min(minY, V.y(position))
    maxX = Math.max(maxX, V.x(position))
    maxY = Math.max(maxY, V.y(position))
  })

  const xRate = (CANVAS_WIDTH - 2 * SIZE) / (maxX - minX)
  const yRate = (CANVAS_HEIGHT - 2 * SIZE) / (maxY - minY)

  return positions.map((position) =>
    math.matrix([
      Math.abs(maxX - minX) < 1e-10
        ? CANVAS_WIDTH / 2
        : SIZE + (V.x(position) - minX) * xRate,
      Math.abs(maxY - minY) < 1e-10
        ? CANVAS_HEIGHT / 2
        : SIZE + (V.y(position) - minY) * yRate,
    ])
  )
}

// 정점들을 한 개씩 간선이 가장 덜 겹치는 지점으로 찍는다
function computeStatePositions(fsm: FiniteStateMachine): Matrix[] {
  const positions: Matrix[] = []
  const stack: StateKey[] = array(fsm.numOfStates).reverse()
  const edgeMap = createEdgeMap(fsm)
  const connectedStates: StateKey[] = []
  const connectedEdges: Edge[] = []
  let feasibleSamples: Matrix[] = []

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
    feasibleSamples = feasibleSamples.concat(createFeasiblePositions(position))
  }

  // DFS
  while (stack.length > 0) {
    // 새로 연결할 정점 뽑기
    const currentState = stack.pop()
    if (positions[currentState]) continue

    // 2개까지는 아무데나 연결
    let selectedSample: Matrix
    if (connectedStates.length === 0) {
      selectedSample = math.matrix([0, 0])
    } else {
      const neighbors = edgeMap[currentState]
        .map((edge) => {
          if (edge.src === currentState) return edge.dst
          return edge.src
        })
        .filter((neighbor) => !!positions[neighbor])

      // 각 샘플에 대하여, 그 샘플로부터 연결되어야 하는 간선이
      // 기존 간선과 얼마나 겹치는지를 계산
      selectedSample = argmin(feasibleSamples, (sample) => {
        let crossCount = 0

        const neighborEdges = neighbors.map((neighbor) => ({
          src: neighbor,
          dst: currentState,
          pSrc: sample,
          pDst: positions[neighbor],
          vSrc: V.sub(positions[neighbor], sample),
        }))

        if (neighborEdges.some(({ vSrc }) => V.len(vSrc) < 1e-10)) {
          return 1e10
        }

        // 뻗어나가는 것과 이미 있는 것들과 겹치는 경우
        neighborEdges.forEach((newEdge) => {
          connectedEdges.forEach((existedEdge) => {
            if (isCrossed(newEdge, existedEdge)) {
              crossCount += 1
            }
          })
        })

        // 자기 자신에서 뻗어나가는 것들끼리 겹치는 경우
        for (let i = 0; i < neighborEdges.length; ++i) {
          for (let j = i + 1; j < neighborEdges.length; ++j) {
            if (isCrossed(neighborEdges[i], neighborEdges[j])) {
              crossCount += 1
            }
          }
        }

        const avgDist =
          neighbors.reduce(
            (avgDist, neighbor) =>
              avgDist + V.len(V.sub(sample, positions[neighbor])),
            0
          ) / neighbors.length

        return quantize(
          crossCount +
            avgDist / Math.sqrt(CANVAS_WIDTH ** 2 + CANVAS_HEIGHT ** 2),
          1e-5
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

  return postProcessForPositions(positions)
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

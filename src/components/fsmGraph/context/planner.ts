import * as V from '@src/utils/vector'
import { Matrix, random } from 'mathjs'
import * as math from 'mathjs'
import { Charset, CHAR_LIST, FiniteStateMachine, StateKey } from '@src/model'
import {
  argmin,
  array,
  isNear,
  MakeOptional,
  MIN_DISTANCE,
  MIN_THR,
  quantize,
} from '@src/utils'
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
    if (V.len(V.sub(pTarget, pSrc)) < MIN_DISTANCE) return 0
    return undefined
  }

  // vSrc.x가 0인 경우
  if (Number.isNaN(t1)) {
    if (isNear(V.x(pTarget), V.x(pSrc), MIN_DISTANCE)) return t2
    return undefined
  }

  // vSrc.y가 0인 경우
  if (Number.isNaN(t2)) {
    if (isNear(V.y(pTarget), V.y(pSrc), MIN_DISTANCE)) return t1
    return undefined
  }

  if (isNear(t1, t2, MIN_THR)) return t1
  return undefined
}

// pSrc를 vSrc 방향으로 지나는 직선과 pTarget의 거리를 구한다
// 오른쪽이면 양수 왼쪽이면 음수
function lineDotDirection(
  pSrc: Matrix,
  vSrc: Matrix,
  pTarget: Matrix
): 1 | -1 | 0 {
  if (V.len(vSrc) === 0)
    throw Error('lineDotDirection: 0-length vector cannot be handled')

  const distance = V.decompose(V.sub(pTarget, pSrc), vSrc)[1]

  if (distance > MIN_DISTANCE) return 1
  else if (distance < -MIN_DISTANCE) return -1
  return 0
}

// 두 간선의 관계를 반환한다.
// separated: 교점 없음
// crossed: 교점이 한 개면서 시작점/끝점은 아님
// degenerated: 그 이외. 시각적으로 문제를 일으키는 상태.
export function getConnectionType(
  e1: Edge,
  e2: Edge
): 'separated' | 'crossed' | 'degenerated' {
  const toE1Src = lineDotDirection(e2.pSrc, e2.vSrc, e1.pSrc)
  const toE1Dst = lineDotDirection(e2.pSrc, e2.vSrc, e1.pDst)
  const toE2Src = lineDotDirection(e1.pSrc, e1.vSrc, e2.pSrc)
  const toE2Dst = lineDotDirection(e1.pSrc, e1.vSrc, e2.pDst)

  if (toE1Src * toE1Dst > 0 || toE2Src * toE2Dst > 0) return 'separated'

  // 길이가 0인 간선을 주지 않으므로, 어느 한 쪽에서 둘 다 0거리가 나왔다는 것은
  // 다른 한 쪽에서도 일직선이라는 뜻이다
  if (toE1Src === 0 && toE1Dst === 0) {
    let tSrc = solveLineEquation(e1.pSrc, e1.vSrc, e2.pSrc)
    let tDst = solveLineEquation(e1.pSrc, e1.vSrc, e2.pDst)
    ;[tSrc, tDst] = [Math.min(tSrc, tDst), Math.max(tSrc, tDst)]

    if (tDst <= 0 || tSrc >= 1) return 'separated'
    return 'degenerated'
  }

  // 한 점이 선분 위에 있는 케이스
  if (toE1Src * toE1Dst === 0 || toE2Src * toE2Dst === 0) {
    // 두 간선이 꼬리를 물고 있느 케이스
    if (toE1Src * toE1Dst === 0 && toE2Src * toE2Dst === 0) return 'separated'
    return 'degenerated'
  }

  // 그 이외는 전부 교차
  return 'crossed'
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
      isNear(maxX, minX, MIN_DISTANCE)
        ? CANVAS_WIDTH / 2
        : SIZE + (V.x(position) - minX) * xRate,
      isNear(maxY, minY, MIN_DISTANCE)
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
    feasibleSamples = feasibleSamples.concat(
      createFeasiblePositions(position).filter((feasible) =>
        connectedStates.every(
          (state) => V.len(V.sub(feasible, positions[state])) >= MIN_THR
        )
      )
    )
  }

  // DFS
  while (stack.length > 0) {
    // 새로 연결할 정점 뽑기
    const currentState = stack.pop()
    if (positions[currentState]) continue

    console.log('working on ' + currentState)

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

        let isDegenerated = neighborEdges.some(
          ({ vSrc }) => V.len(vSrc) < MIN_THR
        )

        // 뻗어나가는 것과 이미 있는 것들과 겹치는 경우
        if (!isDegenerated) {
          neighborEdges.forEach((newEdge) => {
            connectedEdges.forEach((existedEdge) => {
              const type = getConnectionType(newEdge, existedEdge)
              if (type === 'crossed') {
                crossCount += 1
              } else if (type === 'degenerated') {
                isDegenerated = true
              }
            })
          })
        }

        // 자기 자신에서 뻗어나가는 것들끼리 겹치는 경우
        if (!isDegenerated) {
          for (let i = 0; i < neighborEdges.length; ++i) {
            for (let j = i + 1; j < neighborEdges.length; ++j) {
              const type = getConnectionType(neighborEdges[i], neighborEdges[j])
              if (type === 'crossed') {
                crossCount += 1
              } else if (type === 'degenerated') {
                isDegenerated = true
              }
            }
          }
        }

        if (isDegenerated) {
          return 1e10
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
    edgeMap[currentState].forEach(({ src, dst }) => {
      if (!positions[src]) stack.push(src)
      if (!positions[dst]) stack.push(dst)
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

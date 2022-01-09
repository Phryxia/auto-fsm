import React, { useMemo } from 'react'
import { CHAR_LIST, FiniteStateMachine } from '@src/model'
import { array } from '@src/utils'
import { Stage, Layer } from 'react-konva'
import { FSMNode } from './FSMNode'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './shared/consts'
import { FSMProvider } from './context'
import { FSMEdge } from './FSMEdge'

interface FSMGraphProps {
  fsm: FiniteStateMachine
}

export default function FSMGraph({ fsm }: FSMGraphProps) {
  const states = useMemo(() => array(fsm.numOfStates), [fsm])

  return (
    <Stage width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
      <FSMProvider fsm={fsm}>
        <Layer>
          {states.map((id) => (
            <FSMNode
              key={id}
              id={id}
              isAcceptState={fsm.acceptStates.includes(id)}
              isInitialState={id === fsm.initialState}
            />
          ))}
          {states.map((id) => (
            <React.Fragment key={id}>
              {CHAR_LIST.map((char) => (
                <FSMEdge key={char} sid={id} char={char} />
              ))}
            </React.Fragment>
          ))}
        </Layer>
      </FSMProvider>
    </Stage>
  )
}

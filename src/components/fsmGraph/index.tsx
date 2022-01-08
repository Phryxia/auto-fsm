import React, { useMemo } from 'react'
import { FiniteStateMachine } from '@src/model'
import { array } from '@src/utils'
import { Stage, Layer, Circle } from 'react-konva'
import { FSMNode } from './FSMNode'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './shared/consts'
import { FSMContext, FSMProvider } from './FSMContext'
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
              {<FSMEdge sid={id} char={'0'} />}
              {<FSMEdge sid={id} char={'1'} />}
            </React.Fragment>
          ))}
        </Layer>
      </FSMProvider>
    </Stage>
  )
}

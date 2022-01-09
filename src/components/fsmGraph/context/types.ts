import { Charset, FiniteStateMachine } from '@src/model'
import { Matrix } from 'mathjs'

export interface FSMVisualState {
  fsm: FiniteStateMachine
  statePositions: Matrix[]
  edgeProperties: Record<
    Charset,
    {
      xOffset: number
      yOffset: number
    }
  >[]
}

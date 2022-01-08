import React from 'react'
import '@src/styles/global.css'
import FSMGraph from './fsmGraph'
import { FiniteStateMachine } from '@src/model'

const graph = new FiniteStateMachine(
  4,
  [
    {
      '0': 1,
      '1': 0,
    },
    {
      '0': 2,
      '1': 3,
    },
    {
      '0': 2,
      '1': 3,
    },
    {
      '0': 3,
      '1': 1,
    },
  ],
  0,
  [1]
)

export default function App() {
  return (
    <div>
      <FSMGraph fsm={graph} />
    </div>
  )
}

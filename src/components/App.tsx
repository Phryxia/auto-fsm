import React from 'react'
import '@src/styles/global.css'
import FSMGraph from './fsmGraph'
import { Charset, CHAR_LIST, FiniteStateMachine, StateKey } from '@src/model'
import { array } from '@src/utils'
import { randomInt } from 'mathjs'

const N = 16
const graph = new FiniteStateMachine(
  N,
  array(N).map(() => {
    const result: Partial<Record<Charset, StateKey>> = {}
    CHAR_LIST.forEach((char) => (result[char] = randomInt(N)))
    return result as Record<Charset, StateKey>
  }),
  0,
  [0]
)

export default function App() {
  return (
    <div>
      <FSMGraph fsm={graph} />
    </div>
  )
}

import { charAt, StateKey } from '.'
import { Charset } from './types'

export class FiniteStateMachine {
  public constructor(
    public numOfStates: number,
    public transitions: Record<Charset, StateKey>[],
    public initialState: StateKey,
    public acceptStates: StateKey[],
    public readonly id: Symbol = Symbol()
  ) {}

  public isRecognized(s: string): boolean {
    let q: StateKey = this.initialState
    for (let i = 0; i < s.length; ++i) {
      q = this.transitions[q][charAt(s, i)]
    }
    return this.acceptStates.includes(q)
  }
}

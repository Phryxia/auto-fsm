import { array } from '@src/utils'

export type Charset = string

export type StateKey = number

export function charAt(s: string, index: number): Charset {
  if (s.match(/[^01]/))
    throw new Error(`Invalid string "${s}" (unexpected character)`)
  return s.charAt(index) as Charset
}

export const CHAR_LIST: Charset[] = array(2).map((n) => `${n}`)

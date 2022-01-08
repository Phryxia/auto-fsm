export type Charset = '0' | '1'

export type StateKey = number

export function charAt(s: string, index: number): Charset {
  if (s.match(/[^01]/))
    throw new Error(`Invalid string "${s}" (unexpected character)`)
  return s.charAt(index) as Charset
}

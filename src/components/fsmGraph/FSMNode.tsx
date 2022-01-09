import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { StateKey } from '@src/model'
import { Group, Circle, Text, Line } from 'react-konva'
import Konva from 'konva'
import { IDLE_FILL, IDLE_LINE, INIT_FILL, INIT_LINE, SIZE } from './shared/'
import { useFSMVisual } from './context'
import * as math from 'mathjs'

interface FSMNodeProps {
  id: StateKey
  isInitialState?: boolean
  isAcceptState?: boolean
}

export const FSMNode = ({
  id,
  isInitialState,
  isAcceptState,
}: FSMNodeProps) => {
  const { getStatePosition, setStatePosition } = useFSMVisual()
  const [isSelected, setIsSelected] = useState<boolean>(false)
  const textRef = useRef<Konva.Text>()

  useEffect(() => {
    const cb = (e: MouseEvent) => {
      if (isSelected) {
        setStatePosition(id, e.clientX, e.clientY)
        // setX(e.clientX)
        // setY(e.clientY)
      }
    }
    window.addEventListener('mousemove', cb)
    return () => window.removeEventListener('mousemove', cb)
  }, [id, isSelected])

  useEffect(() => {
    const cb = () => setIsSelected(false)
    window.addEventListener('mouseup', cb)
    return () => window.removeEventListener('mouseup', cb)
  }, [])

  useLayoutEffect(() => {
    textRef.current.offsetX(textRef.current.getTextWidth() / 2)
    textRef.current.offsetY(textRef.current.getTextHeight() / 2)
  }, [])

  const fill = isInitialState ? INIT_FILL : IDLE_FILL
  const stroke = isInitialState ? INIT_LINE : IDLE_LINE

  const v = getStatePosition(id)
  const x = math.subset(v, math.index(0)) as unknown as number
  const y = math.subset(v, math.index(1)) as unknown as number

  return (
    <Group x={x} y={y} onMouseDown={() => setIsSelected(true)}>
      {isInitialState && (
        <Line
          stroke={stroke}
          points={[
            -SIZE / 2 - SIZE / 5,
            -SIZE / 5,
            -SIZE / 2,
            0,
            -SIZE / 2 - SIZE / 5,
            SIZE / 5,
          ]}
          strokeWidth={1}
        />
      )}
      <Circle
        width={SIZE}
        height={SIZE}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
      />
      {isAcceptState && (
        <Circle
          width={SIZE * 0.7}
          height={SIZE * 0.7}
          stroke={stroke}
          strokeWidth={0.5}
        />
      )}
      <Text
        text={`${id}`}
        align="center"
        verticalAlign="middle"
        ref={textRef}
        offsetX={(textRef.current?.getWidth() ?? 0) / 2}
        offsetY={(textRef.current?.getHeight() ?? 0) / 2}
      />
    </Group>
  )
}

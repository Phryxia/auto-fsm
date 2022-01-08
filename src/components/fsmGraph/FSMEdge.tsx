import { Charset, StateKey } from '@src/model'
import * as V from '@src/utils/vector'
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Arrow, Circle, Group, Line } from 'react-konva'
import { useFSMVisual } from './FSMContext'
import { IDLE_LINE, INIT_FILL } from './shared'

interface FSMEdgeProps {
  sid: StateKey
  char: Charset
}

export const FSMEdge = ({ sid, char }: FSMEdgeProps) => {
  const { getEdgeDetail, setControlPosition } = useFSMVisual()
  const { controlPoint, spline } = getEdgeDetail(sid, char)
  const [isSelected, setIsSelected] = useState<boolean>(false)
  const [isHovered, setIsHovered] = useState<boolean>(false)

  const x = V.x(controlPoint)
  const y = V.y(controlPoint)

  useEffect(() => {
    function callback() {
      setIsSelected(false)
    }

    window.addEventListener('mouseup', callback)
    return () => window.removeEventListener('mouseup', callback)
  }, [])

  useEffect(() => {
    function callback(event: MouseEvent) {
      if (isSelected) {
        setControlPosition(sid, char, event.clientX, event.clientY)
      }
    }

    window.addEventListener('mousemove', callback)
    return () => window.removeEventListener('mousemove', callback)
  }, [isSelected])

  useLayoutEffect(() => {}, [sid, char, x, y])

  return (
    <>
      <Arrow
        tension={0.5}
        points={spline}
        fill={IDLE_LINE}
        stroke={IDLE_LINE}
        preventDefault={true}
      />

      {/* controller visible */}
      <Circle
        x={x}
        y={y}
        width={8}
        height={8}
        fill={isHovered ? INIT_FILL : IDLE_LINE}
      />

      {/* controller area */}
      <Circle
        x={x}
        y={y}
        width={32}
        height={32}
        onMouseDown={() => setIsSelected(true)}
        onMouseOver={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
    </>
  )
}

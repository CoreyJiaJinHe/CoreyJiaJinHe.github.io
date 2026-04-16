import { memo } from 'react'
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    Position,
    useStore,
} from '@xyflow/react'

function getNodeRect(node) {
    const measuredW = Number(node?.measured?.width)
    const measuredH = Number(node?.measured?.height)
    const nodeW = Number(node?.width)
    const nodeH = Number(node?.height)
    const styleW = Number(node?.style?.width)
    const styleH = Number(node?.style?.height)

    const width = measuredW > 0 ? measuredW : nodeW > 0 ? nodeW : styleW > 0 ? styleW : 220
    const height = measuredH > 0 ? measuredH : nodeH > 0 ? nodeH : styleH > 0 ? styleH : 120

    const x = node.positionAbsolute?.x ?? node.position.x
    const y = node.positionAbsolute?.y ?? node.position.y

    return {
        x,
        y,
        width,
        height,
        cx: x + width / 2,
        cy: y + height / 2,
    }
}

function getIntersectionPoint(sourceRect, targetRect) {
    const x1 = sourceRect.cx
    const y1 = sourceRect.cy
    const x2 = targetRect.cx
    const y2 = targetRect.cy

    const dx = x2 - x1
    const dy = y2 - y1

    const safeDx = dx === 0 ? 0.0001 : dx
    const safeDy = dy === 0 ? 0.0001 : dy

    const halfW = sourceRect.width / 2
    const halfH = sourceRect.height / 2

    const tx = halfW / Math.abs(safeDx)
    const ty = halfH / Math.abs(safeDy)
    const t = Math.min(tx, ty)

    return {
        x: x1 + dx * t,
        y: y1 + dy * t,
    }
}

function getEdgeSide(point, rect) {
    const left = Math.abs(point.x - rect.x)
    const right = Math.abs(point.x - (rect.x + rect.width))
    const top = Math.abs(point.y - rect.y)
    const bottom = Math.abs(point.y - (rect.y + rect.height))
    const min = Math.min(left, right, top, bottom)

    if (min === left) return Position.Left
    if (min === right) return Position.Right
    if (min === top) return Position.Top
    return Position.Bottom
}

const FloatingEdge = memo((props) => {
    const { id, source, target, markerEnd, style, label } = props

    const { sNode, tNode } = useStore((state) => ({
        sNode: state.nodeLookup.get(source),
        tNode: state.nodeLookup.get(target),
    }))

    if (!sNode || !tNode) return null

    const sRect = getNodeRect(sNode)
    const tRect = getNodeRect(tNode)

    const sourcePoint = getIntersectionPoint(sRect, tRect)
    const targetPoint = getIntersectionPoint(tRect, sRect)

    const sourcePosition = getEdgeSide(sourcePoint, sRect)
    const targetPosition = getEdgeSide(targetPoint, tRect)

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX: sourcePoint.x,
        sourceY: sourcePoint.y,
        targetX: targetPoint.x,
        targetY: targetPoint.y,
        sourcePosition,
        targetPosition,
    })

    return (
        <>
            <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />

            <rect
                x={sourcePoint.x - 4}
                y={sourcePoint.y - 4}
                width={8}
                height={8}
                fill="#1a192b"
                stroke="#1a192b"
            />

            <rect
                x={targetPoint.x - 4}
                y={targetPoint.y - 4}
                width={8}
                height={8}
                fill="#1a192b"
                stroke="#1a192b"
            />

            {label ? (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                            fontSize: 11,
                            background: '#fff',
                            border: '1px solid #ccc',
                            padding: '2px 4px',
                            borderRadius: 4,
                            pointerEvents: 'none',
                        }}
                    >
                        {label}
                    </div>
                </EdgeLabelRenderer>
            ) : null}
        </>
    )
})

export default FloatingEdge
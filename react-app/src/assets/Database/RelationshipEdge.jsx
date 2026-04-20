import { memo } from 'react'
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    Position,
    useStore,
} from '@xyflow/react'
import { EDGE_MARKERS } from './constants'

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

function rotatePoint(x, y, cx, cy, angle) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    const dx = x - cx
    const dy = y - cy

    return {
        x: cx + dx * cos - dy * sin,
        y: cy + dx * sin + dy * cos,
    }
}

function getCardinalityPosition(point, otherPoint, nodeCenter) {
    const dx = otherPoint.x - point.x
    const dy = otherPoint.y - point.y
    const length = Math.hypot(dx, dy) || 1

    const ux = dx / length
    const uy = dy / length

    const awayDx = point.x - nodeCenter.x
    const awayDy = point.y - nodeCenter.y
    const awayLength = Math.hypot(awayDx, awayDy) || 1

    const awayUx = awayDx / awayLength
    const awayUy = awayDy / awayLength

    const alongOffset = 18
    const normalOffset = 20

    return {
        x: point.x + ux * alongOffset + awayUx * normalOffset,
        y: point.y + uy * alongOffset + awayUy * normalOffset,
    }
}

function renderRelationshipMarker(kind, point, angle, size = 10) {
    if (!kind || kind === EDGE_MARKERS.NONE) {
        return null
    }

    if (kind === EDGE_MARKERS.DIAMOND_FILLED || kind === EDGE_MARKERS.DIAMOND_HOLLOW) {
        const p1 = rotatePoint(point.x - size, point.y, point.x, point.y, angle)
        const p2 = rotatePoint(point.x, point.y - size, point.x, point.y, angle)
        const p3 = rotatePoint(point.x + size, point.y, point.x, point.y, angle)
        const p4 = rotatePoint(point.x, point.y + size, point.x, point.y, angle)

        return (
            <polygon
                points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
                fill={kind === EDGE_MARKERS.DIAMOND_FILLED ? '#1a192b' : '#fff'}
                stroke="#1a192b"
                strokeWidth={1.5}
            />
        )
    }

    if (kind === EDGE_MARKERS.ARROW_FILLED || kind === EDGE_MARKERS.TRIANGLE_HOLLOW) {
        const tip = point
        const backTop = rotatePoint(point.x - size, point.y - size / 2, point.x, point.y, angle)
        const backBottom = rotatePoint(point.x - size, point.y + size / 2, point.x, point.y, angle)

        return (
            <polygon
                points={`${tip.x},${tip.y} ${backTop.x},${backTop.y} ${backBottom.x},${backBottom.y}`}
                fill={kind === EDGE_MARKERS.ARROW_FILLED ? '#1a192b' : '#fff'}
                stroke="#1a192b"
                strokeWidth={1.5}
            />
        )
    }

    return null
}

const RelationshipEdge = memo((props) => {
    const { id, source, target, style, label, data } = props

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

    const angle = Math.atan2(targetPoint.y - sourcePoint.y, targetPoint.x - sourcePoint.x)
    const fixedMarkerAngle = Math.PI / 2

    const sourceMarkerAngle =
        data?.startMarker === EDGE_MARKERS.DIAMOND_FILLED || data?.startMarker === EDGE_MARKERS.DIAMOND_HOLLOW
            ? fixedMarkerAngle + Math.PI
            : angle + Math.PI

    const targetMarkerAngle =
        data?.endMarker === EDGE_MARKERS.DIAMOND_FILLED || data?.endMarker === EDGE_MARKERS.DIAMOND_HOLLOW
            ? fixedMarkerAngle
            : angle

    const sourceMarker = renderRelationshipMarker(data?.startMarker, sourcePoint, sourceMarkerAngle)
    const targetMarker = renderRelationshipMarker(data?.endMarker, targetPoint, targetMarkerAngle)

    const sourceCardinalityPosition = getCardinalityPosition(sourcePoint, targetPoint, { x: sRect.cx, y: sRect.cy })
    const targetCardinalityPosition = getCardinalityPosition(targetPoint, sourcePoint, { x: tRect.cx, y: tRect.cy })

    return (
        <>
            <BaseEdge id={id} path={edgePath} style={style} />

            {sourceMarker}
            {targetMarker}

            {data?.sourceCardinality ? (
                <EdgeLabelRenderer>
                    <div
                        className="Relationship-Edge-Cardinality"
                        style={{
                            '--edge-label-x': `${sourceCardinalityPosition.x}px`,
                            '--edge-label-y': `${sourceCardinalityPosition.y}px`,
                        }}
                    >
                        {data.sourceCardinality}
                    </div>
                </EdgeLabelRenderer>
            ) : null}

            {data?.targetCardinality ? (
                <EdgeLabelRenderer>
                    <div
                        className="Relationship-Edge-Cardinality"
                        style={{
                            '--edge-label-x': `${targetCardinalityPosition.x}px`,
                            '--edge-label-y': `${targetCardinalityPosition.y}px`,
                        }}
                    >
                        {data.targetCardinality}
                    </div>
                </EdgeLabelRenderer>
            ) : null}

            {label ? (
                <EdgeLabelRenderer>
                    <div
                        className="Relationship-Edge-Label"
                        style={{
                            '--edge-label-x': `${labelX}px`,
                            '--edge-label-y': `${labelY}px`,
                        }}
                    >
                        {label}
                    </div>
                </EdgeLabelRenderer>
            ) : null}
        </>
    )
})

export default RelationshipEdge

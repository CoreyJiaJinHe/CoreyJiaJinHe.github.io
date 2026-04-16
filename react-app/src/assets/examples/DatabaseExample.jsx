import { memo, useState } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    Position,
    Handle,
    useStore
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './DatabaseExample.css'

const EDGE_MARKERS = {
    NONE: 'none',
    DIAMOND_FILLED: 'diamond-filled',
    DIAMOND_HOLLOW: 'diamond-hollow',
    ARROW_FILLED: 'arrow-filled',
    TRIANGLE_HOLLOW: 'triangle-hollow',
}


const TableNode = memo(({ data }) => {
    return (
        <div className="table-node">
            <Handle type="target" position={Position.Top} className="table-node__handle" />
            <Handle type="source" position={Position.Bottom} className="table-node__handle" />
            {data.label}
        </div>
    )
})

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

    // Protect against divide-by-zero
    const safeDx = dx === 0 ? 0.0001 : dx
    const safeDy = dy === 0 ? 0.0001 : dy

    const halfW = sourceRect.width / 2
    const halfH = sourceRect.height / 2

    // Scale ray to hit rectangle boundary
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
function getCardinalityPosition(point, otherPoint) {
    const dx = otherPoint.x - point.x
    const dy = otherPoint.y - point.y
    const length = Math.hypot(dx, dy) || 1

    const ux = dx / length
    const uy = dy / length

    const px = -uy
    const py = ux

    const alongOffset = 18
    const perpendicularOffset = 12

    return {
        x: point.x + ux * alongOffset + px * perpendicularOffset,
        y: point.y + uy * alongOffset + py * perpendicularOffset,
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

    const sourceMarker = renderRelationshipMarker(
        data?.startMarker,
        sourcePoint,
        angle + Math.PI
    )

    const targetMarker = renderRelationshipMarker(
        data?.endMarker,
        targetPoint,
        angle
    )

    const sourceCardinalityPosition = getCardinalityPosition(sourcePoint, targetPoint)
    const targetCardinalityPosition = getCardinalityPosition(targetPoint, sourcePoint)

    return (
        <>
            <BaseEdge id={id} path={edgePath} style={style} />

            {sourceMarker}
            {targetMarker}

            {data?.sourceCardinality ? (
                <EdgeLabelRenderer>
                    <div
                        className="relationship-edge__cardinality"
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
                        className="relationship-edge__cardinality"
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
                        className="relationship-edge__label"
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


function DatabaseExample() {
    const DEV_MODE_ENABLED = true
    const databaseDiagramSrc = new URL('../AP ITEC 4220 Database Diagram.png', import.meta.url).href
    const spoolFileSrc = new URL('../SpoolFile.txt', import.meta.url).href


    const nodeTypes = { TableNode: TableNode }
    const edgeTypes = {
        relationship: RelationshipEdge,
    }



    const initialNodes = [
        {
            id: 'Person',
            type: 'TableNode',
            position: { x: 521, y: -165 },
            data: {
                label: (
                    <div>
                        <u><strong>Person</strong></u>
                        <div>Name</div>
                        <div>Address</div>
                        <div>Phone Number</div>
                        <div>Preferred Email</div>
                        <div>SIN (PK)</div>
                        <div>Emergency Contact</div>
                        <div>Banking Information</div>
                    </div>
                ),
            }
        },
        {
            id: 'Student',
            type: 'TableNode',
            position: { x: -206, y: -19 },
            data: {
                label: (
                    <div>
                        <u><strong>Student</strong></u>
                        <div>Student ID (PK)</div>
                        <div>SIN (FK)</div>
                        <div>Grad Status</div>
                        <div>Faculty ID</div>
                    </div>
                ),
            }
        },
        {
            id: 'Program Affiliation',
            type: 'TableNode',
            position: { x: -635, y: 285 },
            data: {
                label: (
                    <div>
                        <u><strong>Program Affiliation</strong></u>
                        <div>Student ID (FK)</div>
                        <div>Program ID (PK)</div>
                        <div>College ID (FK)</div>
                    </div>
                ),
            }
        },
        {
            id: 'Degree Program',
            type: 'TableNode',
            position: { x: -633, y: 573 },
            data: {
                label: (
                    <div>
                        <u><strong>Degree Program</strong></u>
                        <div>Program ID (PK)</div>
                        <div>Program Name</div>
                        <div>Degree Type</div>
                        <div>Faculty ID</div>
                        <div>Credit Requirements</div>
                        <div>Degree Prerequisites</div>
                    </div>
                ),
            }
        },
        {
            id: 'Degree Prerequisites',
            type: 'TableNode',
            position: { x: -198, y: 573 },
            data: {
                label: (
                    <div>
                        <u><strong>Degree Prerequisites</strong></u>
                        <div>Program ID (FK)</div>
                        <div>Course ID (PK)</div>
                    </div>
                ),
            }
        }
        ,
        {
            id: 'Active Course List',
            type: 'TableNode',
            position: { x: -198, y: 262 },
            data: {
                label: (
                    <div>
                        <u><strong>Active Course List</strong></u>
                        <div>Student ID (FK)</div>
                        <div>Course ID (PK)</div>
                        <div>Grade</div>
                    </div>
                ),
            }
        },
        {
            id: 'Course',
            type: 'TableNode',
            position: { x: 607, y: 457 },
            data: {
                label: (
                    <div>
                        <u><strong>Course</strong></u>
                        <div>Course Id (PK)</div>
                        <div>Course Name</div>
                        <div>Course Description</div>
                        <div>Credit Value</div>
                        <div>Faculty ID</div>
                        <div>Department ID</div>
                        <div>Cost</div>
                        <div>Program ID</div>
                        <div>University</div>
                        <div>Credits</div>
                    </div>
                ),
            }
        },
        {
            id: 'Additional Resources',
            type: 'TableNode',
            position: { x: 333, y: 827 },
            data: {
                label: (
                    <div>
                        <u><strong>Additional Resources</strong></u>
                        <div>Resource ID (PK)</div>
                        <div>Name</div>
                        <div>Price</div>
                        <div>Resource Type</div>
                        <div>Resource Description</div>
                        <div>License Owner</div>
                        <div>Retrieval Location</div>
                        <div>Book (ISBN, Author) (FK)</div>
                    </div>
                ),
            }
        },
        {
            id: 'Book',
            type: 'TableNode',
            position: { x: 101, y: 860 },
            data: {
                label: (
                    <div>
                        <u><strong>Book</strong></u>
                        <div>ISBN (PK)</div>
                        <div>Author</div>
                        <div>Title</div>
                        <div>Publisher</div>
                        <div>Publication Year</div>
                    </div>
                ),
            }
        },
        {
            id: 'Course Prerequisites',
            type: 'TableNode',
            position: { x: 553, y: 906 },
            data: {
                label: (
                    <div>
                        <u><strong>Course Prerequisites</strong></u>
                        <div>Course ID (FK)</div>
                        <div>Prerequisite Course ID (PK)</div>
                    </div>
                ),
            }
        },
        {
            id: 'Past Course History',
            type: 'TableNode',
            position: { x: 787, y: 881 },
            data: {
                label: (
                    <div>
                        <u><strong>Past Course History</strong></u>
                        <div>Course ID (FK)</div>
                        <div>Student ID (FK)</div>
                        <div>Grade</div>
                        <div>Year</div>
                        <div>Term</div>
                    </div>
                ),
            }
        },
        {
            id: 'Section',
            type: 'TableNode',
            position: { x: 1358, y: 755 },
            data: {
                label: (
                    <div>
                        <u><strong>Section</strong></u>
                        <div>Section ID (PK)</div>
                        <div>Course ID (FK)</div>
                        <div>Instructor ID (FK)</div>
                        <div>Term</div>
                        <div>Year</div>
                        <div>Time Slot</div>
                        <div>Start Date</div>
                        <div>End Date</div>
                        <div>Room</div>
                        <div>Location</div>
                        <div>Enrollment Capacity</div>
                        <div>Enrolled Capacity</div>
                    </div>
                ),
            }
        },
        {
            id: 'Course Types',
            type: 'TableNode',
            position: { x: 90, y: 482 },
            data: {
                label: (
                    <div>
                        <u><strong>Course Types</strong></u>
                        <div>Course Type ID (PK)</div>
                        <div>Course Type Name</div>
                        <div>Course Type Description</div>
                    </div>
                ),
            }
        },
        {
            id: 'Room',
            type: 'TableNode',
            position: { x: 1910, y: 987 },
            data: {
                label: (
                    <div>
                        <u><strong>Room</strong></u>
                        <div>Room ID (PK)</div>
                        <div>Building Name</div>
                        <div>Room Number</div>
                        <div>Capacity</div>
                        <div>Resources Available</div>
                    </div>
                ),
            }
        },
        {
            id: 'Dean',
            type: 'TableNode',
            position: { x: 2032, y: 328 },
            data: {
                label: (
                    <div>
                        <u><strong>Dean</strong></u>
                        <div>Dean ID (PK)</div>
                        <div>Office Location</div>
                        <div>Office Number</div>
                        <div>Office Email</div>
                    </div>
                ),
            }
        },
        {
            id: 'Professor',
            type: 'TableNode',
            position: { x: 1361, y: 332 },
            data: {
                label: (
                    <div>
                        <u><strong>Professor</strong></u>
                        <div>Professor ID (PK)</div>
                        <div>Tenure</div>
                        <div>Department ID (FK)</div>
                    </div>
                ),
            }
        },
        {
            id: 'Teaching Assistant',
            type: 'TableNode',
            position: { x: 522, y: 179 },
            data: {
                label: (
                    <div>
                        <u><strong>Teaching Assistant</strong></u>
                        <div>TA ID (PK)</div>
                        <div>Student ID (FK)</div>
                        <div>Department ID (FK)</div>
                        <div>Supervisor</div>
                    </div>
                ),
            }
        },
        {
            id: 'Department',
            type: 'TableNode',
            position: { x: 1712, y: 598 },
            data: {
                label: (
                    <div>
                        <u><strong>Department</strong></u>
                        <div>Department ID (PK)</div>
                        <div>Department Name</div>
                        <div>Department Description</div>
                        <div>Dean ID (FK)</div>
                    </div>
                ),
            }
        },
        {
            id: 'Faculty',
            type: 'TableNode',
            position: { x: 1715, y: 332 },
            data: {
                label: (
                    <div>
                        <u><strong>Faculty</strong></u>
                        <div>Faculty ID (PK)</div>
                        <div>Faculty Name</div>
                        <div>Faculty Description</div>
                    </div>
                ),
            }
        },
        {
            id: 'Staff',
            type: 'TableNode',
            position: { x: 1539, y: -127 },
            data: {
                label: (
                    <div>
                        <u><strong>Staff</strong></u>
                        <div>Staff ID (PK)</div>
                        <div>Position</div>
                        <div>Faculty ID (FK)</div>
                        <div>Department ID (FK)</div>
                    </div>
                ),
            }
        }

    ]

    const initialEdges = [
        {
            id: 'student-person',
            type: 'relationship',
            source: 'Student',
            target: 'Person',
            label: 'FK: SIN',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.TRIANGLE_HOLLOW,
                sourceCardinality: '1',
                targetCardinality: '1',
            },
        },
        {
            id: 'program affiliation-student',
            type: 'relationship',
            source: 'Program Affiliation',
            target: 'Student',
            label: 'FK: Student ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
                sourceCardinality: '0..n',
                targetCardinality: '1',
            },
        },
        {
            id: 'student degree program',
            type: 'relationship',
            source: 'Degree Program',
            target: 'Student',
            label: 'FK: Faculty ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'program affiliation degree program',
            type: 'relationship',
            source: 'Program Affiliation',
            target: 'Degree Program',
            label: 'FK: Program ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
                sourceCardinality: '0..n',
                targetCardinality: '1',
            },
        },
        {
            id: 'program affiliation college',
            type: 'relationship',
            source: 'Program Affiliation',
            target: 'Faculty',
            label: 'FK: College ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'degree program degree program prerequisites',
            type: 'relationship',
            source: 'Degree Program',
            target: 'Degree Prerequisites',
            label: 'FK: Degree Program Prerequisites',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },

        {
            id: 'degree program prerequisites course',
            type: 'relationship',
            source: 'Degree Prerequisites',
            target: 'Course',
            label: 'FK: Course ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'active course list-student',
            type: 'relationship',
            source: 'Active Course List',
            target: 'Student',
            label: 'FK: Student ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
                sourceCardinality: '0..n',
                targetCardinality: '1',
            },
        },
        {
            id: 'active course list-course',
            type: 'relationship',
            source: 'Active Course List',
            target: 'Course',
            label: 'FK: Course ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
                sourceCardinality: '0..n',
                targetCardinality: '1',
            },
        },
        {
            id: 'course-course prerequisites',
            type: 'relationship',
            source: 'Course',
            target: 'Course Prerequisites',
            label: 'FK: Course ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'course past course history',
            type: 'relationship',
            source: 'Course',
            target: 'Past Course History',
            label: 'FK: Course ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'course additional resources',
            type: 'relationship',
            source: 'Course',
            target: 'Additional Resources',
            label: 'FK: Program ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'additional resources book',
            type: 'relationship',
            source: 'Additional Resources',
            target: 'Book',
            label: 'FK: Book (ISBN, Author)',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'section course',
            type: 'relationship',
            source: 'Section',
            target: 'Course',
            label: 'FK: Course ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
                sourceCardinality: '0..n',
                targetCardinality: '1',
            },
        },
        {
            id: 'section professor',
            type: 'relationship',
            source: 'Section',
            target: 'Professor',
            label: 'FK: Instructor ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'section room',
            type: 'relationship',
            source: 'Section',
            target: 'Room',
            label: 'FK: Room ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'course types course',
            type: 'relationship',
            source: 'Course Types',
            target: 'Course',
            label: 'FK: Course Type ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'professor department',
            type: 'relationship',
            source: 'Professor',
            target: 'Department',
            label: 'FK: Department ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'teaching assistant student',
            type: 'relationship',
            source: 'Teaching Assistant',
            target: 'Student',
            label: 'FK: Student ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'teaching assistant professor',
            type: 'relationship',
            source: 'Teaching Assistant',
            target: 'Professor',
            label: 'FK: Supervisor',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'department faculty',
            type: 'relationship',
            source: 'Department',
            target: 'Faculty',
            label: 'FK: Faculty ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'staff faculty',
            type: 'relationship',
            source: 'Staff',
            target: 'Faculty',
            label: 'FK: Faculty ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'dean faculty',
            type: 'relationship',
            source: 'Dean',
            target: 'Faculty',
            label: 'FK: Faculty ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'staff person',
            type: 'relationship',
            source: 'Staff',
            target: 'Person',
            label: 'FK: SIN',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        },
        {
            id: 'dean staff',
            type: 'relationship',
            source: 'Dean',
            target: 'Staff',
            label: 'FK: Staff ID',
            data: {
                startMarker: EDGE_MARKERS.NONE,
                endMarker: EDGE_MARKERS.NONE,
            },
        }


    ]

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
    const [capturedPositions, setCapturedPositions] = useState('')
    const [isDevPanelVisible, setIsDevPanelVisible] = useState(true)

    function handleCaptureCoordinates() {
        const positions = nodes.map((node) => ({
            id: node.id,
            x: Math.round(node.position.x),
            y: Math.round(node.position.y),
        }))
        setCapturedPositions(JSON.stringify(positions, null, 2))
    }

    return (
        <>


            <div>
                <p className="database-example__intro">
                    The Class Diagram of the final design of a University Database using object-relational database management principles.
                </p>

                <div className="database-example__canvas">
                    <ReactFlow nodes={nodes} edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        fitView
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                    >
                        <Background />
                        <Controls />
                        <MiniMap />
                    </ReactFlow>
                    <div className="database-example__floating-panel database-example__legend">
                        <div className="database-example__legend-title">Legend</div>
                        <div><strong>PK</strong>: Primary Key</div>
                        <div><strong>FK</strong>: Foreign Key</div>
                        <div className="database-example__legend-relationship">
                            <span className="database-example__legend-line" />
                            Relationship
                        </div>
                    </div>

                    {DEV_MODE_ENABLED && isDevPanelVisible && (
                        <div className="database-example__floating-panel database-example__dev-panel">
                            <div className="database-example__dev-actions">
                                <button type="button" onClick={handleCaptureCoordinates}>Capture Node Coordinates</button>
                                <button type="button" onClick={() => setIsDevPanelVisible(false)}>Hide Frame</button>
                            </div>
                            <div className="database-example__dev-title">Captured (id, x, y):</div>
                            <textarea
                                className="database-example__textarea"
                                readOnly
                                value={capturedPositions}
                                placeholder="Drag nodes, then click Capture Node Coordinates"
                            />
                        </div>
                    )}
                    {DEV_MODE_ENABLED && !isDevPanelVisible && (
                        <div className="database-example__floating-panel database-example__dev-toggle">
                            <button type="button" onClick={() => setIsDevPanelVisible(true)}>Show Dev Frame</button>
                        </div>
                    )}
                </div>


            </div>
            <p>
                Spool File of Logical Schema Code implemented in Oracle Database down below:
            </p>
            <div>
                <img src={databaseDiagramSrc} className="database-example__diagram-image" alt="Database diagram" />
            </div>
            <div>
                <iframe src={spoolFileSrc} className="database-example__spool-frame" title="Spool file" />
            </div>
        </>
    )
}

export default DatabaseExample

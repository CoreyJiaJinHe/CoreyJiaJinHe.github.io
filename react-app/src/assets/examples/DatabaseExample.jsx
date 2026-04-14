import { useState } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'


function DatabaseExample() {
    const DEV_MODE_ENABLED = true
    const databaseDiagramSrc = new URL('../AP ITEC 4220 Database Diagram.png', import.meta.url).href
    const spoolFileSrc = new URL('../SpoolFile.txt', import.meta.url).href
    const initialNodes = [
        {
            id: 'person',
            position: { x: 580, y: 20 },
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
            },
            style: { width: 220, border: '1px solid #333', borderRadius: 6, background: '#fff' },
        },
        {
            id: 'student',
            position: { x: 120, y: 150 },
            data: {
                label: (
                    <div>
                        <u><strong>Student</strong></u>
                        <div>studentId (PK)</div>
                        <div>SIN (FK)</div>
                        <div>Grad Status</div>
                        <div>Faculty ID</div>
                    </div>
                ),
            },
            style: { width: 220, border: '1px solid #333', borderRadius: 6, background: '#fff' },
        },
        {
            id: 'Program Affiliation',
            position: { x: 300, y: 300 },
            data: {
                label: (
                    <div>
                        <u><strong>Program Affiliation</strong></u>
                        <div>StudentId (FK)</div>
                        <div>Program Id (PK)</div>
                        <div>College ID (FK)</div>
                    </div>
                ),
            },
            style: { width: 220, border: '1px solid #333', borderRadius: 6, background: '#fff' },
        },
        {
            id: 'Degree Program',
            position: { x: 580, y: 300 },
            data: {
                label: (
                    <div>
                        <u><strong>Degree Program</strong></u>
                        <div>Program Id (PK)</div>
                        <div>Program Name</div>
                        <div>Degree Type</div>
                        <div>Faculty ID</div>
                        <div>Credit Requirements</div>
                        <div>Degree Prerequisites</div>
                    </div>
                ),
            },
            style: { width: 220, border: '1px solid #333', borderRadius: 6, background: '#fff' },
        },
        {
            id: 'Active Course List',
            position: { x: 860, y: 300 },
            data: {
                label: (
                    <div>
                        <u><strong>Active Course List</strong></u>
                        <div>Student ID (FK)</div>
                        <div>Course ID (PK)</div>
                        <div>Grade</div>
                    </div>
                ),
            },
            style: { width: 220, border: '1px solid #333', borderRadius: 6, background: '#fff' },
        },
        {
            id: 'Course',
            position: { x: 860, y: 150 },
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
            },
            style: { width: 220, border: '1px solid #333', borderRadius: 6, background: '#fff' },
        },
        {
            id: 'Additional Resources',
            position: { x: 120, y: 300 },
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
            },
            style: { width: 220, border: '1px solid #333', borderRadius: 6, background: '#fff' },
        },
        {
            id: 'Book',
            position: { x: 300, y: 150 },
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
            },
            style: { width: 220, border: '1px solid #333', borderRadius: 6, background: '#fff' },
        },
        {
            id: 'Course Prerequisites',
            position: { x: 580, y: 150 },
            data: {
                label: (
                    <div>
                        <u><strong>Course Prerequisites</strong></u>
                        <div>Course ID (FK)</div>
                        <div>Prerequisite Course ID (PK)</div>
                    </div>
                ),
            },
            style: { width: 220, border: '1px solid #333', borderRadius: 6, background: '#fff' },
        },
        {
            id: 'Past Course History',
            position: { x: 300, y: 450 },
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
            },
            style: { width: 220, border: '1px solid #333', borderRadius: 6, background: '#fff' },
        },
        {
            id: 'Section',
            position: { x: 860, y: 450 },
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
            },
            style: { width: 220, border: '1px solid #333', borderRadius: 6, background: '#fff' },
        },
        {
            id: 'Course Types',
            position: { x: 120, y: 450 },
            data: {
                label: (
                    <div>
                        <u><strong>Course Types</strong></u>
                        <div>Course Type ID (PK)</div>
                        <div>Course Type Name</div>
                        <div>Course Type Description</div>
                    </div>
                ),
            },
            style: { width: 220, border: '1px solid #333', borderRadius: 6, background: '#fff' },
        },
        {
            id: 'Room',
            position: { x: 300, y: 450 },
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
            },
            style: { width: 220, border: '1px solid #333', borderRadius: 6, background: '#fff' },
        },
        {
            id: 'Dean',
            position: { x: 580, y: 450 },
            data: {
                label: (
                    <div>
                        <u><strong>Dean</strong></u>
                        <div>Dean ID (PK)</div>
                        <div>Name</div>
                        <div>Office Location</div>
                        <div>Phone Number</div>
                        <div>Email</div>
                    </div>
                ),
            },
            style: { width: 220, border: '1px solid #333', borderRadius: 6, background: '#fff' },
        },

    ]

    const initialEdges = [
        {
            id: 'student-person',
            source: 'student',
            target: 'person',
            label: 'FK: SIN',
            markerEnd: { type: MarkerType.ArrowClosed },
        },
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
                <p style={{ marginRight: '10px' }}>
                    The Class Diagram of the final design of a University Database using object-relational database management principles.
                    <br /><br />
                    <div style={{ height: '400px', width: '100%', position: 'relative', border: '1px solid #333', borderRadius: 6 }}>
                        <ReactFlow nodes={nodes} edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            fitView >
                            <Background />
                            <Controls />
                            <MiniMap />
                        </ReactFlow>
                        <div
                            style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                zIndex: 10,
                                backgroundColor: 'white',
                                border: '1px solid #333',
                                borderRadius: '6px',
                                padding: '8px 10px',
                                minWidth: '150px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                fontSize: '12px',
                                lineHeight: '1.4',
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: '6px' }}>Legend</div>
                            <div><strong>PK</strong>: Primary Key</div>
                            <div><strong>FK</strong>: Foreign Key</div>
                            <div style={{ marginTop: '6px' }}>
                                <span style={{ display: 'inline-block', width: '18px', borderTop: '2px solid #333', marginRight: '6px', verticalAlign: 'middle' }} />
                                Relationship
                            </div>
                        </div>

                        {DEV_MODE_ENABLED && isDevPanelVisible && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '12px',
                                    left: '12px',
                                    zIndex: 10,
                                    backgroundColor: 'white',
                                    border: '1px solid #333',
                                    borderRadius: '6px',
                                    padding: '8px 10px',
                                    width: '320px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                    fontSize: '12px',
                                    lineHeight: '1.4',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <button type="button" onClick={handleCaptureCoordinates}>Capture Node Coordinates</button>
                                    <button type="button" onClick={() => setIsDevPanelVisible(false)}>Hide Frame</button>
                                </div>
                                <div style={{ marginTop: '8px', fontWeight: 700 }}>Captured (id, x, y):</div>
                                <textarea
                                    readOnly
                                    value={capturedPositions}
                                    placeholder="Drag nodes, then click Capture Node Coordinates"
                                    style={{
                                        marginTop: '6px',
                                        width: '100%',
                                        height: '140px',
                                        minHeight: '140px',
                                        maxHeight: '140px',
                                        resize: 'none',
                                        fontFamily: 'monospace',
                                        fontSize: '11px',
                                    }}
                                />
                            </div>
                        )}

                        {DEV_MODE_ENABLED && !isDevPanelVisible && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '12px',
                                    left: '12px',
                                    zIndex: 10,
                                    backgroundColor: 'white',
                                    border: '1px solid #333',
                                    borderRadius: '6px',
                                    padding: '8px 10px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                }}
                            >
                                <button type="button" onClick={() => setIsDevPanelVisible(true)}>Show Dev Frame</button>
                            </div>
                        )}
                    </div>
                    Spool File of Logical Schema Code implemented in Oracle Database down below:
                </p>
            </div>
            <div>
                <img src={databaseDiagramSrc} style={{ float: 'right', height: '300px' }} alt="Database diagram" />
            </div>
            <div>
                <iframe src={spoolFileSrc} style={{ objectFit: 'contain', float: 'right', height: '634px', width: '99%' }} title="Spool file" />
            </div>
        </>
    )
}

export default DatabaseExample

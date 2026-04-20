import { useState } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './DatabaseExample.css'
import TableNode from '../Database/TableNode'
import RelationshipEdge from '../Database/RelationshipEdge'
import { initialNodes, initialEdges } from '../Database/databaseData'

const nodeTypes = { TableNode }
const edgeTypes = {
    relationship: RelationshipEdge,
}


function DatabaseExample() {
    const DEV_MODE_ENABLED = true
    const databaseDiagramSrc = new URL('../University Database Diagram.png', import.meta.url).href
    const spoolFileSrc = new URL('../University Database Diagram Spool File.txt', import.meta.url).href

    const [nodes, , onNodesChange] = useNodesState(initialNodes)
    const [edges, , onEdgesChange] = useEdgesState(initialEdges)
    const [capturedPositions, setCapturedPositions] = useState('')
    const [isDevPanelVisible, setIsDevPanelVisible] = useState(false)

    function handleCaptureCoordinates() {
        const positions = nodes.map((node) => ({
            id: node.id,
            x: Math.round(node.position.x),
            y: Math.round(node.position.y),
        }))
        setCapturedPositions(JSON.stringify(positions, null, 2))
    }


    const [switchDiagramDisplay, setSwitchDiagramDisplay] = useState(true)
    const [expandSpoolFile, setExpandSpoolFile] = useState(false)


    return (
        <>


            <div>
                <button className="Database-Example-Switch-Button" type="button" onClick={() => setSwitchDiagramDisplay(!switchDiagramDisplay)}>
                    {switchDiagramDisplay ? 'Show Image Diagram' : 'Show Reactive Diagram'}
                </button>

                <p className="Database-Example-Intro">
                    The Class Diagram of the final design of a University Database using object-relational database management principles.
                </p>

                {switchDiagramDisplay ? (
                    <div className="Database-Example-Canvas">
                        <ReactFlow nodes={nodes} edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            fitView
                            snapToGrid
                            snapGrid={[20, 20]}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                        >
                            <Background gap={20} size={1.5} />
                            <Controls />
                            <MiniMap />
                        </ReactFlow>
                        <div className="Database-Example-Floating-Panel Database-Example-Legend">
                            <div className="Database-Example-Legend-Title">Legend</div>
                            <div><strong>PK</strong>: Primary Key</div>
                            <div><strong>FK</strong>: Foreign Key</div>
                            <div className="Database-Example-Legend-Relationship">
                                <span className="Database-Example-Legend-Line" />
                                Relationship
                            </div>
                        </div>

                        {DEV_MODE_ENABLED && isDevPanelVisible && (
                            <div className="Database-Example-Floating-Panel Database-Example-Dev-Panel">
                                <div className="Database-Example-Dev-Actions">
                                    <button type="button" onClick={handleCaptureCoordinates}>Capture Node Coordinates</button>
                                    <button type="button" onClick={() => setIsDevPanelVisible(false)}>Hide Frame</button>
                                </div>
                                <div className="Database-Example-Dev-Title">Captured (id, x, y):</div>
                                <textarea
                                    className="Database-Example-Textarea"
                                    readOnly
                                    value={capturedPositions}
                                    placeholder="Drag nodes, then click Capture Node Coordinates"
                                />
                            </div>
                        )}
                        {DEV_MODE_ENABLED && !isDevPanelVisible && (
                            <div className="Database-Example-Floating-Panel Database-Example-Dev-Toggle">
                                <button type="button" onClick={() => setIsDevPanelVisible(true)}>Show Dev Frame</button>
                            </div>
                        )}
                    </div>
                )
                    : (<div>
                        <img src={databaseDiagramSrc} className="Database-Example-Diagram-Image" alt="Database diagram" />
                    </div>
                    )
                }
            </div>

            <p>
                Spool File of Logical Schema Code implemented in Oracle Database down below:
            </p>
            {expandSpoolFile ? (
                <div className="Database-Example-Spool-Expanded">
                    <pre>
                    <div>
                        <iframe src={spoolFileSrc} className="Database-Example-Spool-Frame" title="Spool file" />
                    </div>
                    </pre>
                </div>
            ) : (
                <button className="Database-Example-Switch-Button" type="button" onClick={() => setExpandSpoolFile(true)}>
                    Expand Spool File
                </button>
            )}
        </>
    )
}

export default DatabaseExample

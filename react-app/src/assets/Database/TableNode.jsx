import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'

const TableNode = memo(({ data }) => {
    return (
        <div className="Table-Node">
            <Handle type="target" position={Position.Top} className="Table-Node-Handle" />
            <Handle type="source" position={Position.Bottom} className="Table-Node-Handle" />
            {data.label}
        </div>
    )
})

export default TableNode

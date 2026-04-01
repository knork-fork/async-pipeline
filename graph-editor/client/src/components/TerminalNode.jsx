import './TerminalNode.css'

function TerminalNode({ node, onDelete, connectedIn, connectedOut }) {
  const isStart = node.name === 'Start'

  return (
    <>
      <div className="graph-node-titlebar">
        <span className="graph-node-title">{node.name}</span>
        <button
          className="graph-node-delete"
          onClick={(e) => onDelete(e, node.id)}
          aria-label={`Remove ${node.name}`}
        >
          ×
        </button>
      </div>
      <div className="graph-node-body">
        <div className="graph-node-pins-row">
          {isStart ? (
            <>
              <span className="graph-node-pin-left" />
              <span className="graph-node-pin-right">
                OUT
                <svg className="graph-node-notch" data-pin-node-id={node.id} data-pin-role="output" data-connected={connectedOut || undefined} viewBox="0 0 14 10">
                  <path className="pin-path" d="M1 1 L9 1 L13 5 L9 9 L1 9 Z" />
                </svg>
              </span>
            </>
          ) : (
            <>
              <span className="graph-node-pin-left">
                <svg className="graph-node-notch" data-pin-node-id={node.id} data-pin-role="input" data-connected={connectedIn || undefined} viewBox="0 0 14 10">
                  <path className="pin-path" d="M13 1 L5 1 L1 5 L5 9 L13 9 Z" />
                </svg>
                IN
              </span>
              <span className="graph-node-pin-right" />
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default TerminalNode

import './TextNode.css'

function TextNode({ node, editing, onEdit, onCommitEdit, onDelete, connected }) {
  return (
    <>
      <div className="graph-node-titlebar">
        <svg className="graph-node-notch" data-pin-node-id={node.id} data-pin-role="input" data-connected={connected || undefined} viewBox="0 0 14 10">
          <path className="pin-path" d="M13 1 L5 1 L1 5 L5 9 L13 9 Z" />
        </svg>
        <span className="graph-node-title">Action</span>
        <button
          className="graph-node-delete"
          onClick={(e) => onDelete(e, node.id)}
          aria-label={`Remove ${node.name}`}
        >
          ×
        </button>
      </div>
      <div
        className="graph-node-body"
        onDoubleClick={() => onEdit(node.id)}
      >
        {editing ? (
          <textarea
            className="graph-node-input"
            defaultValue={node.name}
            rows={1}
            ref={(el) => {
              if (!el) return
              el.focus()
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
            }}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
            onBlur={(e) => onCommitEdit(node.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onCommitEdit(node.id, e.target.value)
              if (e.key === 'Escape') onCommitEdit(node.id, node.name || '')
            }}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="graph-node-name">{node.name}</span>
        )}
      </div>
    </>
  )
}

export default TextNode

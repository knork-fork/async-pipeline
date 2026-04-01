import './CommentNode.css'

function CommentNode({ node, editing, onEdit, onCommitEdit, onDelete }) {
  return (
    <div
      className="comment-node-body"
      onDoubleClick={() => onEdit(node.id)}
    >
      <button
        className="comment-node-delete"
        onClick={(e) => onDelete(e, node.id)}
        aria-label="Remove comment"
      >
        ×
      </button>
      {editing ? (
        <textarea
          className="comment-node-input"
          defaultValue={node.name}
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
          onBlur={(e) => onCommitEdit(node.id, e.target.value, true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onCommitEdit(node.id, e.target.value, true)
            if (e.key === 'Escape') onCommitEdit(node.id, node.name || '', true)
          }}
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="comment-node-text">{node.name || 'Double-click to edit'}</span>
      )}
    </div>
  )
}

export default CommentNode

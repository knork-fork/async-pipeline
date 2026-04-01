import { useState } from 'react'
import './PropertiesPanel.css'

const KEY_PATTERN = /^[a-zA-Z0-9_-]*$/

const COMMENT_COLORS = [
  { id: 'default', label: 'Default', value: '#313338' },
  { id: 'yellow', label: 'Yellow', value: '#5A5130' },
  { id: 'green', label: 'Green', value: '#2F4F3A' },
  { id: 'blue', label: 'Blue', value: '#2F3F52' },
  { id: 'red', label: 'Red', value: '#5A3232' },
]

const RETRY_PRESETS = [0, 1, 2, 3]

function ContractPanel({ node, onUpdate }) {
  const isStart = node.name === 'Start'
  const title = isStart ? 'Input Contract' : 'Output Contract'
  const fields = node.contractKeys || []

  const handleChange = (index, value) => {
    if (!KEY_PATTERN.test(value)) return
    const next = [...fields]
    next[index] = value
    onUpdate(node.id, { contractKeys: next })
  }

  const handleAdd = () => {
    onUpdate(node.id, { contractKeys: [...fields, ''] })
  }

  const handleRemove = (index) => {
    const next = fields.filter((_, i) => i !== index)
    onUpdate(node.id, { contractKeys: next })
  }

  return (
    <>
      <h3 className="properties-title">{title}</h3>
      <div className="properties-fields">
        {fields.map((key, i) => (
          <div key={i} className="properties-field-row">
            <input
              className="properties-input"
              type="text"
              value={key}
              onChange={(e) => handleChange(i, e.target.value)}
              placeholder="key_name"
            />
            <button
              className="properties-field-remove"
              onClick={() => handleRemove(i)}
              aria-label="Remove field"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button className="properties-add-btn" onClick={handleAdd}>
        + Add field
      </button>
    </>
  )
}

function CommentColorPanel({ node, onUpdate }) {
  const current = node.color || 'default'

  return (
    <>
      <h3 className="properties-title">Comment Color</h3>
      <div className="properties-color-options">
        {COMMENT_COLORS.map((c) => (
          <button
            key={c.id}
            className={`properties-color-swatch${current === c.id ? ' properties-color-swatch--active' : ''}`}
            style={{ background: c.value }}
            onClick={() => onUpdate(node.id, { color: c.id })}
            title={c.label}
            aria-label={c.label}
          />
        ))}
      </div>
    </>
  )
}

function StagePanel({ node, onUpdate }) {
  const retryCount = node.retryCount ?? 0
  const onFailure = node.onFailure || 'stop'
  const consumerGroup = node.consumerGroup || ''
  const isCustomRetry = !RETRY_PRESETS.includes(retryCount)
  const [showCustomInput, setShowCustomInput] = useState(isCustomRetry)

  const handleRetryPreset = (value) => {
    setShowCustomInput(false)
    onUpdate(node.id, { retryCount: value })
  }

  const handleCustomClick = () => {
    setShowCustomInput(true)
  }

  const handleCustomChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    onUpdate(node.id, { retryCount: val === '' ? 0 : Number(val) })
  }

  return (
    <>
      <div className="properties-section">
        <h3 className="properties-title">Consumer Group</h3>
        <input
          className="properties-input properties-consumer-input"
          type="text"
          value={consumerGroup}
          onChange={(e) => onUpdate(node.id, { consumerGroup: e.target.value })}
          placeholder="generic"
        />
      </div>
      <h3 className="properties-title">Failure Handling</h3>
      <div className="properties-section">
        <label className="properties-label">Retry</label>
        <div className="properties-retry-group">
          {RETRY_PRESETS.map((n) => (
            <button
              key={n}
              className={`properties-retry-btn${!showCustomInput && retryCount === n ? ' properties-retry-btn--active' : ''}`}
              onClick={() => handleRetryPreset(n)}
            >
              {n}
            </button>
          ))}
          <button
            className={`properties-retry-btn${showCustomInput ? ' properties-retry-btn--active' : ''}`}
            onClick={handleCustomClick}
          >
            Custom
          </button>
        </div>
        {showCustomInput && (
          <input
            className="properties-input properties-retry-input"
            type="text"
            value={retryCount}
            onChange={handleCustomChange}
            placeholder="0"
            autoFocus
          />
        )}
      </div>
      <div className="properties-section">
        <label className="properties-label">On failure</label>
        <div className="properties-radio-group">
          <label className="properties-radio">
            <input
              type="radio"
              name={`on-failure-${node.id}`}
              checked={onFailure === 'stop'}
              onChange={() => onUpdate(node.id, { onFailure: 'stop' })}
            />
            <span>Stop pipeline</span>
          </label>
          <label className="properties-radio">
            <input
              type="radio"
              name={`on-failure-${node.id}`}
              checked={onFailure === 'continue'}
              onChange={() => onUpdate(node.id, { onFailure: 'continue' })}
            />
            <span>Continue</span>
          </label>
          <label className="properties-radio">
            <input
              type="radio"
              name={`on-failure-${node.id}`}
              checked={onFailure === 'route'}
              onChange={() => onUpdate(node.id, { onFailure: 'route' })}
            />
            <span>Route to error branch</span>
          </label>
        </div>
      </div>
    </>
  )
}

function getNodeTitle(node) {
  if (node.type === 'terminal') return `${node.name} Node Properties`
  if (node.type === 'stage') return 'Stage Node Properties'
  if (node.type === 'comment') return 'Comment Node Properties'
  return 'Node Properties'
}

function PropertiesPanel({ node, onUpdate }) {
  if (!node) return null

  return (
    <div className="properties-panel">
      <div className="properties-header">
        <h2 className="properties-node-title">{getNodeTitle(node)}</h2>
        {node.yamlId && <span className="properties-node-id">id: {node.yamlId}</span>}
      </div>
      {node.type === 'terminal' && <ContractPanel node={node} onUpdate={onUpdate} />}
      {node.type === 'comment' && <CommentColorPanel node={node} onUpdate={onUpdate} />}
      {node.type === 'stage' && <StagePanel node={node} onUpdate={onUpdate} />}
    </div>
  )
}

export default PropertiesPanel

import './FileTree.css'

function FileTree({ stages, conditions, pipelines, selectedPipeline, expandedPaths, onToggleExpand, search }) {
  const q = search?.toLowerCase() || ''

  const filteredStages = q ? stages.filter((s) => s.toLowerCase().includes(q)) : stages
  const filteredConditions = q ? conditions.filter((c) => c.toLowerCase().includes(q)) : conditions
  const otherPipelines = (pipelines || []).filter((p) => p !== selectedPipeline)
  const filteredPipelines = q ? otherPipelines.filter((p) => p.toLowerCase().includes(q)) : otherPipelines

  const stagesOpen = !!expandedPaths['__stages__']
  const conditionsOpen = !!expandedPaths['__conditions__']
  const pipelinesOpen = !!expandedPaths['__pipelines__']

  return (
    <ul className="file-tree">
      <li className="file-tree-node">
        <div
          className="file-tree-row file-tree-row--dir"
          onClick={() => onToggleExpand('__stages__')}
        >
          <span className="file-tree-chevron">{stagesOpen ? '▾' : '▸'}</span>
          <span className="file-tree-icon">{stagesOpen ? '📂' : '📁'}</span>
          <span className="file-tree-name">Stages</span>
        </div>
        {stagesOpen && (
          <ul className="file-tree-children">
            {filteredStages.length === 0 && (
              <li className="file-tree-node">
                <div className="file-tree-row file-tree-row--empty">
                  <span className="file-tree-chevron file-tree-chevron--spacer" />
                  <span className="file-tree-item-empty">No stages found</span>
                </div>
              </li>
            )}
            {filteredStages.map((name) => (
              <li key={name} className="file-tree-node">
                <div
                  className="file-tree-row file-tree-row--stage"
                  draggable="true"
                  onDragStart={(e) => {
                    e.stopPropagation()
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      name,
                      type: 'stage',
                    }))
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                >
                  <span className="file-tree-chevron file-tree-chevron--spacer" />
                  <span className="file-tree-icon file-tree-icon--stage">S</span>
                  <span className="file-tree-name" title={name}>{name}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </li>
      <li className="file-tree-node">
        <div
          className="file-tree-row file-tree-row--dir"
          onClick={() => onToggleExpand('__conditions__')}
        >
          <span className="file-tree-chevron">{conditionsOpen ? '▾' : '▸'}</span>
          <span className="file-tree-icon">{conditionsOpen ? '📂' : '📁'}</span>
          <span className="file-tree-name">Conditions</span>
        </div>
        {conditionsOpen && (
          <ul className="file-tree-children">
            {filteredConditions.length === 0 && (
              <li className="file-tree-node">
                <div className="file-tree-row file-tree-row--empty">
                  <span className="file-tree-chevron file-tree-chevron--spacer" />
                  <span className="file-tree-item-empty">No conditions found</span>
                </div>
              </li>
            )}
            {filteredConditions.map((name) => (
              <li key={name} className="file-tree-node">
                <div
                  className="file-tree-row file-tree-row--condition"
                  draggable="true"
                  onDragStart={(e) => {
                    e.stopPropagation()
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      name,
                      type: 'condition',
                    }))
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                >
                  <span className="file-tree-chevron file-tree-chevron--spacer" />
                  <span className="file-tree-icon file-tree-icon--condition">C</span>
                  <span className="file-tree-name" title={name}>{name}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </li>
      <li className="file-tree-node">
        <div
          className="file-tree-row file-tree-row--dir"
          onClick={() => onToggleExpand('__pipelines__')}
        >
          <span className="file-tree-chevron">{pipelinesOpen ? '▾' : '▸'}</span>
          <span className="file-tree-icon">{pipelinesOpen ? '📂' : '📁'}</span>
          <span className="file-tree-name">Pipelines</span>
        </div>
        {pipelinesOpen && (
          <ul className="file-tree-children">
            {filteredPipelines.length === 0 && (
              <li className="file-tree-node">
                <div className="file-tree-row file-tree-row--empty">
                  <span className="file-tree-chevron file-tree-chevron--spacer" />
                  <span className="file-tree-item-empty">No other pipelines</span>
                </div>
              </li>
            )}
            {filteredPipelines.map((name) => (
              <li key={name} className="file-tree-node">
                <div
                  className="file-tree-row file-tree-row--pipeline"
                  draggable="true"
                  onDragStart={(e) => {
                    e.stopPropagation()
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      name,
                      type: 'pipeline',
                    }))
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                >
                  <span className="file-tree-chevron file-tree-chevron--spacer" />
                  <span className="file-tree-icon file-tree-icon--pipeline">P</span>
                  <span className="file-tree-name" title={name}>{name}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </li>
      {(!q || 'start'.includes(q)) && (
        <li className="file-tree-node">
          <div
            className="file-tree-row file-tree-row--terminal"
            draggable="true"
            onDragStart={(e) => {
              e.stopPropagation()
              e.dataTransfer.setData('application/json', JSON.stringify({
                name: 'Start',
                type: 'terminal',
              }))
              e.dataTransfer.effectAllowed = 'copy'
            }}
          >
            <span className="file-tree-chevron file-tree-chevron--spacer" />
            <span className="file-tree-icon file-tree-icon--terminal">S</span>
            <span className="file-tree-name">Start</span>
          </div>
        </li>
      )}
      {(!q || 'end'.includes(q)) && (
        <li className="file-tree-node">
          <div
            className="file-tree-row file-tree-row--terminal"
            draggable="true"
            onDragStart={(e) => {
              e.stopPropagation()
              e.dataTransfer.setData('application/json', JSON.stringify({
                name: 'End',
                type: 'terminal',
              }))
              e.dataTransfer.effectAllowed = 'copy'
            }}
          >
            <span className="file-tree-chevron file-tree-chevron--spacer" />
            <span className="file-tree-icon file-tree-icon--terminal">E</span>
            <span className="file-tree-name">End</span>
          </div>
        </li>
      )}
      {(!q || 'comment'.includes(q)) && (
        <li className="file-tree-node">
          <div
            className="file-tree-row file-tree-row--comment"
            draggable="true"
            onDragStart={(e) => {
              e.stopPropagation()
              e.dataTransfer.setData('application/json', JSON.stringify({
                name: '',
                type: 'comment',
              }))
              e.dataTransfer.effectAllowed = 'copy'
            }}
          >
            <span className="file-tree-chevron file-tree-chevron--spacer" />
            <span className="file-tree-icon file-tree-icon--comment">#</span>
            <span className="file-tree-name">Comment</span>
          </div>
        </li>
      )}
    </ul>
  )
}

export default FileTree

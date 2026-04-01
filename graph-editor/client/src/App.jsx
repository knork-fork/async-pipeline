import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import SidebarToolbar from './components/SidebarToolbar'
import FileTree from './components/FileTree'
import GraphEditor from './components/GraphEditor'
import PropertiesPanel from './components/PropertiesPanel'
import { generateSpec } from './utils/generateSpec'
import { yamlToGraph } from './utils/yamlConvert'
import { useAutoSave } from './hooks/useAutoSave'
import './App.css'

function Toast({ message, show }) {
  if (!show) return null
  return (
    <div className="toast-notification">
      <span className="toast-icon">✓</span>
      {message}
    </div>
  )
}

const SIDEBAR_MIN = 140
const SIDEBAR_MAX = 800
const SIDEBAR_DEFAULT = 220
const STORAGE_KEY = 'sidebar-width'

const RIGHT_SIDEBAR_MIN = 180
const RIGHT_SIDEBAR_MAX = 600
const RIGHT_SIDEBAR_DEFAULT = 260
const RIGHT_STORAGE_KEY = 'right-sidebar-width'

function getRightInitialWidth() {
  const stored = localStorage.getItem(RIGHT_STORAGE_KEY)
  if (stored) {
    const n = Number(stored)
    if (n >= RIGHT_SIDEBAR_MIN && n <= RIGHT_SIDEBAR_MAX) return n
  }
  return RIGHT_SIDEBAR_DEFAULT
}

const EXPANDED_PREFIX = 'expanded-paths:'
const SELECTED_PIPELINE_KEY = 'selected-pipeline'
const NEW_VALUE = '__NEW__'

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function getInitialWidth() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    const n = Number(stored)
    if (n >= SIDEBAR_MIN && n <= SIDEBAR_MAX) return n
  }
  return SIDEBAR_DEFAULT
}

function App() {
  const [sidebarWidth, setSidebarWidth] = useState(getInitialWidth)
  const [pipelines, setPipelines] = useState([])
  const [selectedPipeline, _setSelectedPipeline] = useState(() => localStorage.getItem(SELECTED_PIPELINE_KEY) || '')
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [stages, setStages] = useState([])
  const [conditions, setConditions] = useState([])
  const [search, setSearch] = useState('')
  const [expandedPaths, _setExpandedPaths] = useState({})
  const [graphNodes, _setGraphNodes] = useState([])
  const [graphEdges, _setGraphEdges] = useState([])
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 })
  const [yamlInvalid, setYamlInvalid] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '' })
  const [selectedNodeIds, setSelectedNodeIds] = useState(new Set())
  const [rightSidebarWidth, setRightSidebarWidth] = useState(getRightInitialWidth)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)
  const dropdownRef = useRef(null)
  const dragging = useRef(false)
  const draggingRight = useRef(false)

  const setSelectedPipeline = useCallback((name) => {
    _setSelectedPipeline(name)
    localStorage.setItem(SELECTED_PIPELINE_KEY, name)
  }, [])

  const setExpandedPaths = useCallback((updater) => {
    _setExpandedPaths((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (selectedPipeline) {
        localStorage.setItem(EXPANDED_PREFIX + selectedPipeline, JSON.stringify(next))
      }
      return next
    })
  }, [selectedPipeline])

  const setGraphNodes = useCallback((updater) => {
    _setGraphNodes((prev) => typeof updater === 'function' ? updater(prev) : updater)
  }, [])

  const setGraphEdges = useCallback((updater) => {
    _setGraphEdges((prev) => typeof updater === 'function' ? updater(prev) : updater)
  }, [])

  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const onRightMouseDown = useCallback((e) => {
    e.preventDefault()
    draggingRight.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMouseMove = (e) => {
      if (dragging.current) {
        const newWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, e.clientX))
        setSidebarWidth(newWidth)
      }
      if (draggingRight.current) {
        const newWidth = Math.min(RIGHT_SIDEBAR_MAX, Math.max(RIGHT_SIDEBAR_MIN, window.innerWidth - e.clientX))
        setRightSidebarWidth(newWidth)
      }
    }

    const onMouseUp = () => {
      if (dragging.current) {
        dragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      if (draggingRight.current) {
        draggingRight.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(sidebarWidth))
  }, [sidebarWidth])

  useEffect(() => {
    localStorage.setItem(RIGHT_STORAGE_KEY, String(rightSidebarWidth))
  }, [rightSidebarWidth])

  // Determine if a node with properties is selected for the right sidebar
  const selectedPanelNode = useMemo(() => {
    if (selectedNodeIds.size !== 1) return null
    const id = [...selectedNodeIds][0]
    const node = graphNodes.find((n) => n.id === id)
    if (node && (node.type === 'terminal' || node.type === 'comment' || node.type === 'stage')) return node
    return null
  }, [selectedNodeIds, graphNodes])

  // Auto-open/close right sidebar when a relevant node is selected
  useEffect(() => {
    setRightSidebarOpen(!!selectedPanelNode)
  }, [selectedPanelNode])

  // Fetch pipelines from backend on mount
  const fetchPipelines = useCallback(() => {
    axios.get('/api/pipelines')
      .then((res) => setPipelines(res.data.pipelines || []))
      .catch(() => setPipelines([]))
  }, [])

  const fetchStageClasses = useCallback(() => {
    axios.get('/api/stage-classes')
      .then((res) => {
        setStages(res.data.stages || [])
        setConditions(res.data.conditions || [])
      })
      .catch(() => {
        setStages([])
        setConditions([])
      })
  }, [])

  useEffect(() => {
    fetchPipelines()
    fetchStageClasses()
  }, [fetchPipelines, fetchStageClasses])

  // Load per-pipeline data when pipeline changes
  useEffect(() => {
    if (!selectedPipeline) {
      _setExpandedPaths({})
      _setGraphNodes([])
      _setGraphEdges([])
      setYamlInvalid(false)
      return
    }
    _setExpandedPaths(loadJson(EXPANDED_PREFIX + selectedPipeline, {}))
    setYamlInvalid(false)

    axios.get(`/api/pipelines/${encodeURIComponent(selectedPipeline)}/config`)
      .then((res) => {
        const result = yamlToGraph(res.data.config)
        if (result === null) {
          setYamlInvalid(true)
          _setGraphNodes([])
          _setGraphEdges([])
        } else {
          _setGraphNodes(result.nodes)
          _setGraphEdges(result.edges)
          setCamera(result.viewport)
        }
      })
      .catch((err) => {
        if (err.response?.status === 422) {
          setYamlInvalid(true)
        }
        _setGraphNodes([])
        _setGraphEdges([])
      })
  }, [selectedPipeline])

  const saving = useAutoSave(selectedPipeline, graphNodes, graphEdges, camera, !yamlInvalid && !!selectedPipeline)

  // Reset search when switching pipelines
  useEffect(() => {
    setSearch('')
  }, [selectedPipeline])

  const handleToggleExpand = useCallback((path) => {
    setExpandedPaths((prev) => {
      const next = { ...prev }
      if (next[path]) {
        delete next[path]
      } else {
        next[path] = true
      }
      return next
    })
  }, [setExpandedPaths])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectItem = (val) => {
    if (val === NEW_VALUE) {
      setShowNewModal(true)
      setDropdownOpen(false)
      return
    }
    setSelectedPipeline(val)
    setDropdownOpen(false)
  }

  const handleDeletePipeline = (name, e) => {
    e.stopPropagation()
    axios.delete(`/api/pipelines/${encodeURIComponent(name)}`)
      .then(() => {
        fetchPipelines()
        localStorage.removeItem(EXPANDED_PREFIX + name)
        if (selectedPipeline === name) {
          setSelectedPipeline('')
        }
      })
      .catch(() => {})
  }

  const handleSaveNew = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    axios.post('/api/pipelines', { name: trimmed })
      .then((res) => {
        fetchPipelines()
        setSelectedPipeline(res.data.name)
        setNewName('')
        setShowNewModal(false)
      })
      .catch(() => {})
  }

  const handleCancelNew = () => {
    setNewName('')
    setShowNewModal(false)
  }

  const handleUpdateNode = useCallback((nodeId, fields) => {
    setGraphNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, ...fields } : n))
  }, [setGraphNodes])

  return (
    <div className="app">
      <header className="top-bar">
        <div className="pipeline-select" ref={dropdownRef}>
          <div
            className="pipeline-select-trigger"
            onClick={() => setDropdownOpen((v) => !v)}
          >
            <span className={selectedPipeline ? 'pipeline-select-value' : 'pipeline-select-placeholder'}>
              {selectedPipeline || 'Pipelines'}
            </span>
            <span className="pipeline-select-arrow">&#9662;</span>
          </div>
          {dropdownOpen && (
            <div className="pipeline-select-menu">
              <div
                className="pipeline-select-item pipeline-select-item--new"
                onClick={() => handleSelectItem(NEW_VALUE)}
              >
                NEW
              </div>
              {pipelines.map((p) => (
                <div
                  key={p}
                  className={`pipeline-select-item${selectedPipeline === p ? ' pipeline-select-item--active' : ''}`}
                  onClick={() => handleSelectItem(p)}
                  title={p}
                >
                  <span className="pipeline-select-item-label">{p}</span>
                  <button
                    className="pipeline-select-item-delete"
                    onClick={(e) => handleDeletePipeline(p, e)}
                    aria-label={`Delete ${p}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="top-bar-actions">
          <button
            className="btn-copy"
            onClick={() => {
              const spec = generateSpec(graphNodes, graphEdges, selectedPipeline)
              if (spec) {
                navigator.clipboard.writeText(spec)
                setToast({ show: true, message: 'Copied to clipboard' })
                setTimeout(() => setToast({ show: false, message: '' }), 3000)
              }
            }}
          >Copy to clipboard</button>
          <button className="btn-run">Run</button>
        </div>
      </header>

      {showNewModal && (
        <div className="modal-backdrop" onClick={handleCancelNew}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCancelNew} aria-label="Close modal"></button>
            <h2 className="modal-title">New Pipeline</h2>
            <div className="modal-body">
              <label className="modal-label">Pipeline name</label>
              <input
                className="modal-input"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
                placeholder="my-pipeline"
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCancelNew}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveNew}>Save</button>
            </div>
          </div>
        </div>
      )}
      <div className="bottom-area">
        <aside className="sidebar" style={{ width: sidebarWidth }}>
          <SidebarToolbar
            search={search}
            onSearchChange={setSearch}
            onCollapseAll={() => setExpandedPaths({})}
            onRefresh={fetchStageClasses}
          />
          <div className="sidebar-file-list">
            <FileTree stages={stages} conditions={conditions} pipelines={pipelines} selectedPipeline={selectedPipeline} expandedPaths={expandedPaths} onToggleExpand={handleToggleExpand} search={search} />
          </div>
          <div className="sidebar-resize-handle" onMouseDown={onMouseDown} />
        </aside>
        <main className="content">
          <GraphEditor nodes={graphNodes} setNodes={setGraphNodes} edges={graphEdges} setEdges={setGraphEdges} camera={camera} setCamera={setCamera} saving={saving} yamlInvalid={yamlInvalid} disableDrop={yamlInvalid} selectedNodeIds={selectedNodeIds} setSelectedNodeIds={setSelectedNodeIds} />
        </main>
        {rightSidebarOpen && (
          <aside className="sidebar sidebar--right" style={{ width: rightSidebarWidth }}>
            <div className="sidebar-resize-handle sidebar-resize-handle--left" onMouseDown={onRightMouseDown} />
            <PropertiesPanel node={selectedPanelNode} onUpdate={handleUpdateNode} />
          </aside>
        )}
      </div>
      <Toast message={toast.message} show={toast.show} />
    </div>
  )
}

export default App

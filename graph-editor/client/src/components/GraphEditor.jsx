import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import TextNode from './TextNode'
import StageNode from './StageNode'
import ConditionNode from './ConditionNode'
import TerminalNode from './TerminalNode'
import PipelineNode from './PipelineNode'
import CommentNode from './CommentNode'
import './GraphEditor.css'

function getPinPosition(canvasEl, nodeId, role, camera) {
  const pinEl = canvasEl.querySelector(
    `[data-node-id="${nodeId}"] [data-pin-role="${role}"]`
  )
  if (!pinEl) return null
  const canvasRect = canvasEl.getBoundingClientRect()
  const pinRect = pinEl.getBoundingClientRect()
  const screenX = pinRect.left + pinRect.width / 2 - canvasRect.left
  const screenY = pinRect.top + pinRect.height / 2 - canvasRect.top
  return {
    x: (screenX - camera.x) / camera.zoom,
    y: (screenY - camera.y) / camera.zoom,
  }
}

const EDGE_LOOP_GAP = 50
const EDGE_LOOP_MARGIN = 80
const EDGE_ARROW_LEN = 10
const EDGE_ARROW_HALF = 4

function arrowPoints(x, y, angleDeg) {
  const rad = angleDeg * Math.PI / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const bx = x - cos * EDGE_ARROW_LEN
  const by = y - sin * EDGE_ARROW_LEN
  return `${x},${y} ${bx + sin * EDGE_ARROW_HALF},${by - cos * EDGE_ARROW_HALF} ${bx - sin * EDGE_ARROW_HALF},${by + cos * EDGE_ARROW_HALF}`
}

function EdgePath({ x1, y1, x2, y2, isTemporary, onDelete }) {
  const dx = x2 - x1
  const isForward = dx > 50
  let d, arrows

  if (isForward) {
    const offset = Math.max(50, dx * 0.5)
    d = `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    const angle = Math.atan2(y2 - y1, dx - offset) * 180 / Math.PI
    arrows = [{ x: midX, y: midY, angle }]
  } else {
    const gap = EDGE_LOOP_GAP
    const loopY = y2 >= y1 ? y2 - EDGE_LOOP_MARGIN : y2 + EDGE_LOOP_MARGIN
    const rightX = x1 + gap
    const leftX = x2 - gap
    const midLoopX = (rightX + leftX) / 2
    const v1 = Math.sign(loopY - y1) || 1
    const v2 = Math.sign(y2 - loopY) || 1
    const r = Math.max(0, Math.min(15, gap - 1, (rightX - leftX) / 2, Math.abs(y1 - loopY) / 2, Math.abs(y2 - loopY) / 2))

    d = [
      `M ${x1} ${y1}`,
      `L ${rightX - r} ${y1}`,
      `Q ${rightX} ${y1}, ${rightX} ${y1 + v1 * r}`,
      `L ${rightX} ${loopY - v1 * r}`,
      `Q ${rightX} ${loopY}, ${rightX - r} ${loopY}`,
      `L ${leftX + r} ${loopY}`,
      `Q ${leftX} ${loopY}, ${leftX} ${loopY + v2 * r}`,
      `L ${leftX} ${y2 - v2 * r}`,
      `Q ${leftX} ${y2}, ${leftX + r} ${y2}`,
      `L ${x2} ${y2}`,
    ].join(' ')

    arrows = [
      { x: midLoopX, y: loopY, angle: 180 },
      { x: (leftX + x2) / 2, y: y2, angle: 0 },
    ]
  }

  const edgeCls = `graph-edge${isTemporary ? ' graph-edge--temp' : ''}`
  const arrowCls = `graph-edge-arrow${isTemporary ? ' graph-edge-arrow--temp' : ''}`

  return (
    <g className="graph-edge-group">
      {!isTemporary && (
        <path
          d={d}
          fill="none"
          stroke="transparent"
          strokeWidth={12}
          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
          onClick={onDelete ? (e) => { e.stopPropagation(); onDelete() } : undefined}
        />
      )}
      <path className={edgeCls} d={d} style={{ pointerEvents: 'none' }} />
      {arrows.map((a, i) => (
        <polygon
          key={i}
          className={arrowCls}
          points={arrowPoints(a.x, a.y, a.angle)}
          style={{ pointerEvents: 'none' }}
        />
      ))}
    </g>
  )
}

const COMMENT_COLORS = {
  default: '#313338',
  yellow: '#5A5130',
  green: '#2F4F3A',
  blue: '#2F3F52',
  red: '#5A3232',
}

const MIN_ZOOM = 0.2
const MAX_ZOOM = 1.2
const ZOOM_SPEED = 0.001

function GraphEditor({ nodes, setNodes, edges, setEdges, camera, setCamera, saving, yamlInvalid, disableDrop, selectedNodeIds, setSelectedNodeIds }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draggingEdge, setDraggingEdge] = useState(null)
  const [selectionBox, setSelectionBox] = useState(null)
  const canvasRef = useRef(null)
  const dragInfo = useRef(null)
  const dragCounter = useRef(0)
  const cameraRef = useRef(camera)
  cameraRef.current = camera

  const connectedOutputs = useMemo(() => new Set(edges.map((e) => e.fromNodeId)), [edges])
  const connectedInputs = useMemo(() => new Set(edges.map((e) => e.toNodeId)), [edges])
  const connectedPins = useMemo(() => new Set(edges.map((e) => `${e.fromNodeId}:${e.fromPin || 'output'}`)), [edges])

  // Wheel zoom (cursor-based)
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const handleWheel = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top
      const cam = cameraRef.current
      const delta = -e.deltaY * ZOOM_SPEED
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.zoom * (1 + delta)))
      const scale = newZoom / cam.zoom
      setCamera({
        x: cursorX - (cursorX - cam.x) * scale,
        y: cursorY - (cursorY - cam.y) * scale,
        zoom: newZoom,
      })
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = disableDrop ? 'none' : 'copy'
  }, [disableDrop])

  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    dragCounter.current++
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragOver(false)
    if (disableDrop) return

    const raw = e.dataTransfer.getData('application/json')
    if (!raw) return

    let data
    try {
      data = JSON.parse(raw)
    } catch {
      return
    }

    const rect = canvasRef.current.getBoundingClientRect()
    const cam = cameraRef.current
    const x = (e.clientX - rect.left - cam.x) / cam.zoom
    const y = (e.clientY - rect.top - cam.y) / cam.zoom

    setNodes((prev) => {
      const maxId = prev.reduce((max, n) => Math.max(max, n.id), 0)
      const newNode = {
        id: maxId + 1,
        name: data.name,
        type: data.type,
        x,
        y,
      }
      if (data.type === 'condition') {
        newNode.conditionKey = ''
        newNode.conditionExpected = ''
      }
      if (data.type === 'stage') {
        newNode.retryCount = 0
        newNode.onFailure = 'stop'
      }
      if (data.type === 'terminal') {
        newNode.contractKeys = []
      }
      return [...prev, newNode]
    })
  }, [setNodes, disableDrop])

  const handleNodeMouseDown = useCallback((e, nodeId) => {
    if (e.target.closest('.graph-node-delete')) return

    // Check if mousedown is on a pin — start edge dragging instead of node drag
    const pinEl = e.target.closest('.graph-node-notch')
    if (pinEl) {
      e.preventDefault()
      e.stopPropagation()
      const role = pinEl.dataset.pinRole
      const isOutput = role.startsWith('output')
      const pinNodeId = Number(pinEl.dataset.pinNodeId)
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const pinRect = pinEl.getBoundingClientRect()
      const cam = cameraRef.current
      const pinScreenX = pinRect.left + pinRect.width / 2 - canvasRect.left
      const pinScreenY = pinRect.top + pinRect.height / 2 - canvasRect.top
      const px = (pinScreenX - cam.x) / cam.zoom
      const py = (pinScreenY - cam.y) / cam.zoom

      const startEdge = isOutput
        ? { fromNodeId: pinNodeId, fromPin: role, x1: px, y1: py, x2: px, y2: py }
        : { toNodeId: pinNodeId, x1: px, y1: py, x2: px, y2: py }
      setDraggingEdge(startEdge)

      const handleMouseMove = (moveEvent) => {
        const cam = cameraRef.current
        const mx = (moveEvent.clientX - canvasRect.left - cam.x) / cam.zoom
        const my = (moveEvent.clientY - canvasRect.top - cam.y) / cam.zoom
        setDraggingEdge((prev) => {
          if (!prev) return null
          if (prev.fromNodeId != null) {
            return { ...prev, x2: mx, y2: my }
          } else {
            return { ...prev, x1: mx, y1: my }
          }
        })
      }

      const handleMouseUp = (upEvent) => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)

        const targetEl = document.elementFromPoint(upEvent.clientX, upEvent.clientY)
        let targetPin = targetEl?.closest('.graph-node-notch')

        // Snap: if dropped on a node but not on its pin, find the matching pin
        if (!targetPin) {
          const targetNode = targetEl?.closest('.graph-node')
          if (targetNode) {
            if (isOutput) {
              const candidate = targetNode.querySelector('[data-pin-role="input"]')
              if (candidate) targetPin = candidate
            } else {
              // When dragging from input, snap to the first output pin
              const candidate = targetNode.querySelector('[data-pin-role^="output"]')
              if (candidate) targetPin = candidate
            }
          }
        }

        if (targetPin) {
          const targetRole = targetPin.dataset.pinRole
          const targetIsOutput = targetRole.startsWith('output')
          const targetNodeId = Number(targetPin.dataset.pinNodeId)

          let fromId, toId, fromPin
          if (isOutput && !targetIsOutput) {
            fromId = pinNodeId
            toId = targetNodeId
            fromPin = role
          } else if (!isOutput && targetIsOutput) {
            fromId = targetNodeId
            toId = pinNodeId
            fromPin = targetRole
          }

          if (fromId != null && toId != null && fromId !== toId) {
            setEdges((prevEdges) => {
              if (prevEdges.some((e) => e.fromNodeId === fromId && e.toNodeId === toId && e.fromPin === fromPin)) {
                return prevEdges
              }
              const maxId = prevEdges.reduce((max, e) => Math.max(max, e.id), 0)
              return [...prevEdges, { id: maxId + 1, fromNodeId: fromId, toNodeId: toId, fromPin }]
            })
          }
          setDraggingEdge(null)
          return
        }

        setDraggingEdge(null)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return
    }

    // Normal node dragging
    e.preventDefault()

    // Determine which nodes to drag
    const isAlreadySelected = selectedNodeIds.has(nodeId)
    const draggedIds = isAlreadySelected ? selectedNodeIds : new Set([nodeId])
    if (!isAlreadySelected) {
      setSelectedNodeIds(new Set([nodeId]))
    }

    // Snapshot start positions for all dragged nodes
    const startPositions = []
    for (const id of draggedIds) {
      const el = document.querySelector(`[data-node-id="${id}"]`)
      if (!el) continue
      const st = window.getComputedStyle(el)
      startPositions.push({ id, startX: parseFloat(st.left), startY: parseFloat(st.top) })
    }

    dragInfo.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPositions,
    }

    const handleMouseMove = (moveEvent) => {
      const info = dragInfo.current
      if (!info) return
      const cam = cameraRef.current
      const dx = (moveEvent.clientX - info.startMouseX) / cam.zoom
      const dy = (moveEvent.clientY - info.startMouseY) / cam.zoom

      setNodes((prev) =>
        prev.map((n) => {
          const sp = info.startPositions.find((s) => s.id === n.id)
          if (!sp) return n
          return { ...n, x: sp.startX + dx, y: sp.startY + dy }
        })
      )
    }

    const handleMouseUp = () => {
      dragInfo.current = null
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [setNodes, setEdges, selectedNodeIds])

  const handleDeleteNode = useCallback((e, nodeId) => {
    e.stopPropagation()
    setNodes((prev) => prev.filter((n) => n.id !== nodeId))
    setEdges((prev) => prev.filter((edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId))
  }, [setNodes, setEdges])

  const handleDeleteEdge = useCallback((edgeId) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId))
  }, [setEdges])

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target.closest('.graph-node')) return

    // Middle mouse button — pan
    if (e.button === 1) {
      e.preventDefault()
      let lastX = e.clientX
      let lastY = e.clientY

      const handleMouseMove = (moveEvent) => {
        const dx = moveEvent.clientX - lastX
        const dy = moveEvent.clientY - lastY
        lastX = moveEvent.clientX
        lastY = moveEvent.clientY
        setCamera((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
      }

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return
    }

    // Left mouse button — box select
    if (e.button !== 0) return

    const canvasRect = canvasRef.current.getBoundingClientRect()
    const startX = e.clientX - canvasRect.left
    const startY = e.clientY - canvasRect.top
    let moved = false

    const handleMouseMove = (moveEvent) => {
      moved = true
      const cx = moveEvent.clientX - canvasRect.left
      const cy = moveEvent.clientY - canvasRect.top
      setSelectionBox({ startX, startY, currentX: cx, currentY: cy })
    }

    const handleMouseUp = (upEvent) => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)

      if (moved) {
        const cx = upEvent.clientX - canvasRect.left
        const cy = upEvent.clientY - canvasRect.top
        const minX = Math.min(startX, cx)
        const maxX = Math.max(startX, cx)
        const minY = Math.min(startY, cy)
        const maxY = Math.max(startY, cy)

        // Convert screen selection bounds to world coords
        const cam = cameraRef.current
        const wMinX = (minX - cam.x) / cam.zoom
        const wMaxX = (maxX - cam.x) / cam.zoom
        const wMinY = (minY - cam.y) / cam.zoom
        const wMaxY = (maxY - cam.y) / cam.zoom

        const ids = new Set()
        for (const node of nodes) {
          if (node.x >= wMinX && node.x <= wMaxX && node.y >= wMinY && node.y <= wMaxY) {
            ids.add(node.id)
          }
        }
        setSelectedNodeIds(ids)
      } else {
        setSelectedNodeIds(new Set())
      }
      setSelectionBox(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [nodes])

  // Keyboard delete for selected nodes
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (editingId != null) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.size === 0) return
        // Don't intercept if focus is on an input/textarea/select
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        setNodes((prev) => prev.filter((n) => !selectedNodeIds.has(n.id)))
        setEdges((prev) => prev.filter((edge) => !selectedNodeIds.has(edge.fromNodeId) && !selectedNodeIds.has(edge.toNodeId)))
        setSelectedNodeIds(new Set())
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeIds, editingId, setNodes, setEdges])

  const handleUpdateNode = useCallback((nodeId, fields) => {
    setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, ...fields } : n))
  }, [setNodes])

  // Remove fail edges when a stage's onFailure changes away from 'route'
  useEffect(() => {
    const stageIds = new Set(
      nodes.filter((n) => n.type === 'stage' && n.onFailure !== 'route').map((n) => n.id)
    )
    if (stageIds.size === 0) return
    setEdges((prev) => {
      const next = prev.filter((e) => !(stageIds.has(e.fromNodeId) && e.fromPin === 'output-fail'))
      return next.length === prev.length ? prev : next
    })
  }, [nodes, setEdges])

  const handleCommitEdit = useCallback((nodeId, value, keepEmpty) => {
    setEditingId(null)
    const trimmed = value.trim()
    if (!trimmed && !keepEmpty) {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId))
      setEdges((prev) => prev.filter((edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId))
    } else {
      setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, name: trimmed } : n))
    }
  }, [setNodes, setEdges])

  // Compute edge positions from DOM after render
  const [edgePaths, setEdgePaths] = useState([])
  useEffect(() => {
    if (!canvasRef.current) { setEdgePaths([]); return }
    const cam = cameraRef.current
    const paths = edges.map((edge) => {
      const fromPin = edge.fromPin || 'output'
      const from = getPinPosition(canvasRef.current, edge.fromNodeId, fromPin, cam)
      const to = getPinPosition(canvasRef.current, edge.toNodeId, 'input', cam)
      if (!from || !to) return null
      return { id: edge.id, x1: from.x, y1: from.y, x2: to.x, y2: to.y }
    }).filter(Boolean)
    setEdgePaths(paths)
  }, [nodes, edges, camera])

  // Zoom to a specific level centered on the viewport
  const zoomTo = useCallback((newZoom) => {
    const el = canvasRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    setCamera((prev) => {
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom))
      const scale = clamped / prev.zoom
      return {
        x: cx - (cx - prev.x) * scale,
        y: cy - (cy - prev.y) * scale,
        zoom: clamped,
      }
    })
  }, [])

  const handleSliderMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const trackEl = e.currentTarget.closest('.zoom-meter-track')
    if (!trackEl) return

    const update = (clientY) => {
      const rect = trackEl.getBoundingClientRect()
      const ratio = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
      const newZoom = MIN_ZOOM + ratio * (MAX_ZOOM - MIN_ZOOM)
      zoomTo(newZoom)
    }

    update(e.clientY)

    const handleMouseMove = (moveEvent) => update(moveEvent.clientY)
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [zoomTo])

  // Prevent middle-click paste/auto-scroll
  const handleAuxClick = useCallback((e) => {
    if (e.button === 1) e.preventDefault()
  }, [])

  const bgStyle = {
    backgroundPosition: `${camera.x}px ${camera.y}px`,
  }

  const zoomRatio = (camera.zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)
  const zoomPct = Math.round(camera.zoom * 100)

  return (
    <div
      className={`graph-editor${isDragOver ? ' drag-over' : ''}`}
      ref={canvasRef}
      style={bgStyle}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={handleCanvasMouseDown}
      onAuxClick={handleAuxClick}
    >
      <div
        className="graph-editor-world"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
        }}
      >
        <svg className="graph-editor-svg">
          {edgePaths.map((ep) => (
            <EdgePath
              key={ep.id}
              x1={ep.x1} y1={ep.y1}
              x2={ep.x2} y2={ep.y2}
              onDelete={() => handleDeleteEdge(ep.id)}
            />
          ))}
          {draggingEdge && (
            <EdgePath
              x1={draggingEdge.x1} y1={draggingEdge.y1}
              x2={draggingEdge.x2} y2={draggingEdge.y2}
              isTemporary
            />
          )}
        </svg>
        {nodes.map((node) => (
          <div
            key={node.id}
            className={`graph-node${selectedNodeIds.has(node.id) ? ' graph-node--selected' : ''}`}
            data-node-id={node.id}
            data-type={node.type}
            style={{ left: node.x, top: node.y, ...(node.type === 'comment' && node.color && COMMENT_COLORS[node.color] ? { background: COMMENT_COLORS[node.color] } : {}) }}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
          >
            {node.type === 'text' && (
              <TextNode
                node={node}
                editing={editingId === node.id}
                onEdit={setEditingId}
                onCommitEdit={handleCommitEdit}
                onDelete={handleDeleteNode}
                connected={connectedInputs.has(node.id)}
              />
            )}
            {node.type === 'stage' && (
              <StageNode node={node} onDelete={handleDeleteNode} connectedIn={connectedInputs.has(node.id)} connectedOut={connectedPins.has(`${node.id}:output`)} connectedFail={connectedPins.has(`${node.id}:output-fail`)} showFailPin={node.onFailure === 'route'} />
            )}
            {node.type === 'condition' && (
              <ConditionNode node={node} onDelete={handleDeleteNode} onUpdate={handleUpdateNode} connectedIn={connectedInputs.has(node.id)} connectedOut={connectedPins.has(`${node.id}:output`)} connectedFalse={connectedPins.has(`${node.id}:output-false`)} />
            )}
            {node.type === 'terminal' && (
              <TerminalNode node={node} onDelete={handleDeleteNode} connectedIn={connectedInputs.has(node.id)} connectedOut={connectedOutputs.has(node.id)} />
            )}
            {node.type === 'pipeline' && (
              <PipelineNode node={node} onDelete={handleDeleteNode} connectedIn={connectedInputs.has(node.id)} connectedOut={connectedOutputs.has(node.id)} />
            )}
            {node.type === 'comment' && (
              <CommentNode
                node={node}
                editing={editingId === node.id}
                onEdit={setEditingId}
                onCommitEdit={handleCommitEdit}
                onDelete={handleDeleteNode}
              />
            )}
          </div>
        ))}
      </div>
      {!yamlInvalid && nodes.length === 0 && (
        <div className="graph-editor-empty">
          Drag stages or conditions from the sidebar
        </div>
      )}
      {yamlInvalid && (
        <div className="graph-editor-invalid">
          Invalid YAML structure, please check config file
        </div>
      )}
      {saving && <div className="graph-save-spinner" />}
      <div className="zoom-meter" onMouseDown={(e) => e.stopPropagation()}>
        <div className="zoom-meter-track" onMouseDown={handleSliderMouseDown}>
          <div className="zoom-meter-fill" style={{ height: `${zoomRatio * 100}%` }} />
          <div className="zoom-meter-thumb" style={{ bottom: `${zoomRatio * 100}%` }} />
        </div>
        <button
          className="zoom-meter-reset"
          onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
          title="Reset zoom"
        >
          {zoomPct}%
        </button>
      </div>
      {selectionBox && (
        <div
          className="graph-selection-box"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.currentX - selectionBox.startX),
            height: Math.abs(selectionBox.currentY - selectionBox.startY),
          }}
        />
      )}
    </div>
  )
}

export default GraphEditor

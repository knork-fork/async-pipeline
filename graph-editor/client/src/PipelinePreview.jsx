import { useState, useEffect, useRef } from 'react'
import GraphEditor from './components/GraphEditor.jsx'
import { yamlToGraph } from './utils/yamlConvert.js'

function PipelinePreview() {
  const config = window.__PREVIEW_CONFIG || {}
  const params = new URLSearchParams(window.location.search)
  const dataUrl = config.dataUrl || params.get('dataUrl') || ''

  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 })
  const [runningNodeId, setRunningNodeId] = useState(null)
  const cameraInitialised = useRef(false)

  useEffect(() => {
    if (!dataUrl) return

    const poll = () => {
      fetch(dataUrl)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return
          const graph = yamlToGraph(data)
          if (!graph) return
          setNodes(graph.nodes)
          setEdges(graph.edges)
          if (!cameraInitialised.current) {
            setCamera(graph.viewport)
            cameraInitialised.current = true
          }
          setRunningNodeId(data.currentRunningNodeId || null)
        })
        .catch(() => {})
    }

    poll()
    const interval = setInterval(poll, 1000)
    return () => clearInterval(interval)
  }, [dataUrl])

  return (
    <GraphEditor
      readOnly
      runningNodeId={runningNodeId}
      nodes={nodes}
      setNodes={() => {}}
      edges={edges}
      setEdges={() => {}}
      camera={camera}
      setCamera={setCamera}
      saving={false}
      yamlInvalid={false}
      disableDrop
      selectedNodeIds={new Set()}
      setSelectedNodeIds={() => {}}
    />
  )
}

export default PipelinePreview

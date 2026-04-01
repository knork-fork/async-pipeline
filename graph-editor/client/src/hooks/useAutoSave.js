import { useRef, useEffect, useState } from 'react'
import axios from 'axios'
import { graphToYaml } from '../utils/yamlConvert'

export function useAutoSave(pipelineName, nodes, edges, camera, enabled) {
  const [saving, setSaving] = useState(false)
  const lastSavedRef = useRef(null)
  const timerRef = useRef(null)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const cameraRef = useRef(camera)
  nodesRef.current = nodes
  edgesRef.current = edges
  cameraRef.current = camera

  useEffect(() => {
    lastSavedRef.current = null
  }, [pipelineName])

  useEffect(() => {
    if (!enabled || !pipelineName) {
      clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      const current = JSON.stringify({
        nodes: nodesRef.current,
        edges: edgesRef.current,
        camera: cameraRef.current,
      })
      if (current === lastSavedRef.current) return

      const config = graphToYaml(nodesRef.current, edgesRef.current, cameraRef.current)
      setSaving(true)
      lastSavedRef.current = current

      axios.put(`/api/pipelines/${encodeURIComponent(pipelineName)}/config`, { config })
        .then(() => setSaving(false))
        .catch(() => {
          setSaving(false)
          lastSavedRef.current = null
        })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [pipelineName, enabled])

  return saving
}

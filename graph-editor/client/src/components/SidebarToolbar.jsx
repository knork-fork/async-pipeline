import './SidebarToolbar.css'

function SidebarToolbar({ search, onSearchChange, onRefresh, onCollapseAll }) {
  return (
    <div className="sidebar-toolbar">
      <div className="sidebar-search-wrapper">
        <input
          className="sidebar-search"
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {search && (
          <button
            className="sidebar-search-clear"
            aria-label="Clear search"
            onClick={() => onSearchChange('')}
          >
            ×
          </button>
        )}
      </div>
      <button
        className="sidebar-toolbar-btn"
        aria-label="Collapse all"
        title="Collapse all"
        onClick={onCollapseAll}
      >
        ⊟
      </button>
      <button
        className="sidebar-toolbar-btn"
        aria-label="Refresh file list"
        title="Refresh"
        onClick={onRefresh}
      >
        ↻
      </button>
    </div>
  )
}

export default SidebarToolbar

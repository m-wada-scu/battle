import { ArchiveListPage } from './components/ArchiveListPage'
import { ThreadView } from './components/ThreadView'
import { parseArchiveThreadId, usePathname } from './hooks/usePathname'

function App() {
  const pathname = usePathname()

  if (pathname === '/archive') {
    return (
      <div className="app">
        <ArchiveListPage />
      </div>
    )
  }

  const archiveThreadId = parseArchiveThreadId(pathname)
  if (archiveThreadId) {
    return (
      <div className="app">
        <ThreadView archiveThreadId={archiveThreadId} />
      </div>
    )
  }

  return (
    <div className="app">
      <ThreadView />
    </div>
  )
}

export default App

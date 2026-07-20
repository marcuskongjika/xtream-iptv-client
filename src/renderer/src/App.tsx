import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { Header } from './components/Header'
import { MovieDetailModal } from './components/MovieDetailModal'
import { Player } from './components/Player'
import { SeriesDetailModal } from './components/SeriesDetailModal'
import { Sidebar } from './components/Sidebar'
import { Toasts } from './components/Toasts'
import { BrowseScreen } from './screens/BrowseScreen'
import { FavoritesScreen } from './screens/FavoritesScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { SearchScreen } from './screens/SearchScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { SetupScreen } from './screens/SetupScreen'
import { useServerStore } from './stores/servers'
import { useUIStore } from './stores/ui'
import type { Section } from './types'

function CurrentScreen({ section }: { section: Section }): JSX.Element {
  switch (section) {
    case 'live':
      return <BrowseScreen kind="live" />
    case 'movies':
      return <BrowseScreen kind="vod" />
    case 'series':
      return <BrowseScreen kind="series" />
    case 'search':
      return <SearchScreen />
    case 'favorites':
      return <FavoritesScreen />
    case 'history':
      return <HistoryScreen />
    case 'settings':
      return <SettingsScreen />
  }
}

export default function App(): JSX.Element {
  const theme = useUIStore((s) => s.theme)
  const section = useUIStore((s) => s.section)
  const active = useServerStore((s) => s.active)
  const status = useServerStore((s) => s.status)
  const autoConnect = useServerStore((s) => s.autoConnect)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    autoConnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!active) {
    return (
      <>
        {status === 'connecting' ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-zinc-500">
            <Loader2 size={32} className="animate-spin" />
            Connecting…
          </div>
        ) : (
          <SetupScreen />
        )}
        <Toasts />
      </>
    )
  }

  return (
    <>
      <div className="flex h-full">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <Header />
          <CurrentScreen section={section} />
        </main>
      </div>
      <MovieDetailModal />
      <SeriesDetailModal />
      <Player />
      <Toasts />
    </>
  )
}

import { lazy, Suspense, useEffect } from 'react'
import { RouterProvider, useRouter } from './router/router'
import { HomeFeedScreen } from './screens/HomeFeedScreen'
import { ConsentBanner } from './components/ConsentBanner'
import { env } from './config/env'
import { ensureSignedIn } from './services/auth/authService'
import { logEvent, resetSession } from './services/events/eventLogger'

// Route-level code splitting: every screen except the home feed is a
// separate chunk, fetched only when navigated to.
const GameDetailScreen = lazy(() => import('./screens/GameDetailScreen').then((m) => ({ default: m.GameDetailScreen })))
const ProfileSettingsScreen = lazy(() =>
  import('./screens/ProfileSettingsScreen').then((m) => ({ default: m.ProfileSettingsScreen })),
)
const DebugScreen = lazy(() => import('./screens/DebugScreen').then((m) => ({ default: m.DebugScreen })))
const PrivacyScreen = lazy(() => import('./screens/PrivacyScreen').then((m) => ({ default: m.PrivacyScreen })))
const TermsScreen = lazy(() => import('./screens/TermsScreen').then((m) => ({ default: m.TermsScreen })))

function Screens() {
  const { route } = useRouter()
  switch (route.name) {
    case 'home':
      return <HomeFeedScreen />
    case 'game':
      return <GameDetailScreen creativeId={route.creativeId} />
    case 'profile':
      return <ProfileSettingsScreen />
    case 'debug':
      // Belt-and-suspenders: even if something links here, don't route to
      // the debug chunk at all in a production build.
      return env.debugScreenEnabled ? <DebugScreen /> : <HomeFeedScreen />
    case 'privacy':
      return <PrivacyScreen />
    case 'terms':
      return <TermsScreen />
    default:
      // Malformed/unknown hash — never crash on a bad route, just go home.
      return <HomeFeedScreen />
  }
}

export default function App() {
  useEffect(() => {
    // Deferred boot work: runs AFTER the first paint (this effect only
    // fires post-mount), never blocking it. See config/env.ts and
    // services/auth/authService.ts for what each step actually does.
    resetSession()
    void ensureSignedIn().then(() => {
      logEvent('app_open')
      if (env.isInternalTestUser) logEvent('internal_test_user')
    })
  }, [])

  return (
    <RouterProvider>
      <Suspense fallback={<div className="screen" />}>
        <Screens />
      </Suspense>
      <ConsentBanner />
    </RouterProvider>
  )
}

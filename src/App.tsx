import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom'

import MainLayout from './layouts/MainLayout'
import ApiMetaProvider from './context/ApiMetaProvider'
import ConsoleHeartbeatProvider from './context/ConsoleHeartbeatProvider'
import OperationsProvider from './context/OperationsProvider'
import ServerStatusProvider from './context/ServerStatusProvider'

import Dashboard from './pages/Dashboard'
import Worlds from './pages/Worlds'
import Console from './pages/Console'
import Players from './pages/Players'
import Settings from './pages/Settings'
import Operations from './pages/Operations'

// v2: the Terraria-style theme. Lives beside the classic UI at /next and
// shares every provider below, so it is additive rather than a rewrite.
import './v2/theme/index.css'
import V2Layout from './v2/layouts/V2Layout'
import V2Dashboard from './v2/pages/V2Dashboard'
import KitchenSink from './v2/pages/KitchenSink'
import V2Placeholder from './v2/pages/V2Placeholder'


function App() {
  return (
    <BrowserRouter>

      <ApiMetaProvider>

        <ConsoleHeartbeatProvider>

          <OperationsProvider>

            <ServerStatusProvider>

              <Routes>

                {/* v2 — Terraria-style theme, reviewed before it replaces
                    anything. The classic routes below are untouched. */}
                <Route path="/next" element={<V2Layout />}>

                  <Route index element={<V2Dashboard />} />

                  <Route
                    path="kit"
                    element={<KitchenSink />}
                  />

                  <Route
                    path="worlds"
                    element={
                      <V2Placeholder
                        title="Worlds"
                        icon="worlds"
                        source="/worlds"
                      />
                    }
                  />

                  <Route
                    path="players"
                    element={
                      <V2Placeholder
                        title="Players"
                        icon="players"
                        source="/players"
                      />
                    }
                  />

                  <Route
                    path="console"
                    element={
                      <V2Placeholder
                        title="Console"
                        icon="console"
                        source="/console"
                      />
                    }
                  />

                  <Route
                    path="operations"
                    element={
                      <V2Placeholder
                        title="Operations"
                        icon="operations"
                        source="/operations"
                      />
                    }
                  />

                  <Route
                    path="settings"
                    element={
                      <V2Placeholder
                        title="Settings"
                        icon="settings"
                        source="/settings"
                      />
                    }
                  />

                </Route>

                <Route element={<MainLayout />}>

                  <Route
                    path="/"
                    element={<Dashboard />}
                  />

                  <Route
                    path="/worlds"
                    element={<Worlds />}
                  />

                  <Route
                    path="/players"
                    element={<Players />}
                  />

                  <Route
                    path="/console"
                    element={<Console />}
                  />

                  <Route
                    path="/operations"
                    element={<Operations />}
                  />

                  <Route
                    path="/settings"
                    element={<Settings />}
                  />

                </Route>

              </Routes>

            </ServerStatusProvider>

          </OperationsProvider>

        </ConsoleHeartbeatProvider>

      </ApiMetaProvider>

    </BrowserRouter>
  )
}


export default App

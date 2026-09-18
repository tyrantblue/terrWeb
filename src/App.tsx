import {
  BrowserRouter,
  Navigate,
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


function App() {
  return (
    <BrowserRouter>

      <ApiMetaProvider>

        <ConsoleHeartbeatProvider>

          <OperationsProvider>

            <ServerStatusProvider>

              <Routes>

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

                  {/* The v2 preview lived at /next; send any stale
                      bookmark or typo back to the dashboard. */}
                  <Route
                    path="*"
                    element={<Navigate to="/" replace />}
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

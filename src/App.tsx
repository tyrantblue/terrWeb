import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom'

import MainLayout from './layouts/MainLayout'

import Dashboard from './pages/Dashboard'
import Worlds from './pages/Worlds'
import Console from './pages/Console'
import Players from './pages/Players'
import Settings from './pages/Settings'
import Operations from './pages/Operations'


function App() {
  return (
    <BrowserRouter>

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

        </Route>

      </Routes>

    </BrowserRouter>
  )
}


export default App

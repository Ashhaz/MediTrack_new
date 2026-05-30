import { BrowserRouter, Routes, Route } from "react-router-dom"

import Home from "./pages/Home"
import Dashboard from "./pages/Dashboard"
import Medicines from "./pages/medicines"
import Reports from "./pages/Reports"
import Settings from "./pages/Settings"
import AppShell from "./components/AppShell"

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Home />} />

        <Route
          path="/dashboard"
          element={
            <AppShell>
              <Dashboard />
            </AppShell>
          }
        />

        <Route
          path="/medicines"
          element={
            <AppShell>
              <Medicines />
            </AppShell>
          }
        />

        <Route
          path="/reports"
          element={
            <AppShell>
              <Reports />
            </AppShell>
          }
        />

        <Route
          path="/settings"
          element={
            <AppShell>
              <Settings />
            </AppShell>
          }
        />

      </Routes>

    </BrowserRouter>
  )
}

export default App

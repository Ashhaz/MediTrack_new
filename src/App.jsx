import { BrowserRouter, Routes, Route } from "react-router-dom"

import Home from "./pages/Home"
import Dashboard from "./pages/Dashboard"
import Medicines from "./pages/Medicines"
import Reports from "./pages/Reports"
import Settings from "./pages/Settings"
import AppShell from "./components/AppShell"
import { useMedicationReminders } from "./hooks/useMedicationReminders"

function App() {
  useMedicationReminders()

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>

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
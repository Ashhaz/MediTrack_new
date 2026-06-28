import { HashRouter, Routes, Route, Navigate } from "react-router-dom"
import { lazy, Suspense } from "react";
import { useAuth } from "./context/AuthContext";

const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Medicines = lazy(() => import("./pages/Medicines"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
import AppShell from "./components/AppShell"
import ProtectedRoute from "./components/ProtectedRoute";

const LoadingScreen = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#04110f]">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent"></div>
  </div>
);

/**
 * AuthRoute — the inverse of ProtectedRoute.
 * Wraps public-only pages (landing, login, register).
 * If a valid session already exists, skip the page and go straight to /dashboard.
 * While loading, show a spinner so the login page never flashes briefly.
 */
function AuthRoute({ children }) {
  const { session, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (session) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <HashRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>

        <Route path="/" element={<AuthRoute><Home /></AuthRoute>} />
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppShell>
                <Dashboard />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/medicines"
          element={
            <ProtectedRoute>
              <AppShell>
                <Medicines />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <AppShell>
                <Reports />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AppShell>
                <Settings />
              </AppShell>
            </ProtectedRoute>
          }
        />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
  
export default App
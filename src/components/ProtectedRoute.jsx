import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute reads session state from the global AuthContext.
 * - While the session is being restored (app startup / PWA reopen), it shows
 *   a full-screen spinner instead of briefly flashing the login page.
 * - Once loading is done: authenticated → render children, else → /login.
 */
function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#04110f]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent" />
      </div>
    );
  }

  return session ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
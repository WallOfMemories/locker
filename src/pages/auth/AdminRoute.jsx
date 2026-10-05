import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Only for accounts whose profile has role: "admin".
// (This just hides the page — the backend checks admin access on every
// request, so the real protection lives there.)
function AdminRoute() {
  const { profile, loading } = useAuth();

  if (loading) return null;

  if (profile?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default AdminRoute;
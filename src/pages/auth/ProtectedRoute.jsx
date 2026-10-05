import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Requires login. Users who haven't finished profile setup are
// sent to /setup-profile, except on routes marked allowIncomplete.
function ProtectedRoute({ allowIncomplete = false }) {
  const { currentUser, needsProfileSetup, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (needsProfileSetup && !allowIncomplete) {
    return <Navigate to="/setup-profile" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
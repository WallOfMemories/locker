import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Login / Register: logged-in users are sent into the app.
function PublicOnlyRoute() {
  const { currentUser, loading } = useAuth();
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

  if (currentUser) {
    const from = location.state?.from;
    // keep the query too, so /?snap=<id> reopens the same Snap after login
    const destination = from
      ? `${from.pathname || "/"}${from.search || ""}`
      : "/";

    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}

export default PublicOnlyRoute;
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
    const destination = location.state?.from?.pathname || "/";

    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}

export default PublicOnlyRoute;
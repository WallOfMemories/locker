import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { peekReturnTo, takeReturnTo } from "../../utils/returnTo";

// Login / Register: logged-in users are sent into the app.
function PublicOnlyRoute() {
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

  if (currentUser) {
    // New account: finish profile setup first. The place they were heading
    // stays remembered and setup sends them there afterwards.
    if (needsProfileSetup) {
      return <Navigate to="/setup-profile" replace />;
    }

    const saved = peekReturnTo() && takeReturnTo();
    const from = location.state?.from;

    // 1) where they were heading when asked to log in (e.g. Create Snap),
    // 2) otherwise the page that sent them to login, 3) the wall.
    const target = saved || from;

    const destination = target
      ? `${target.pathname || "/"}${target.search || ""}`
      : "/";

    return (
      <Navigate to={destination} replace state={target?.state || null} />
    );
  }

  return <Outlet />;
}

export default PublicOnlyRoute;
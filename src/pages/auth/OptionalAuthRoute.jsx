import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Pages anyone can look at (the wall, About). Visitors who are not logged in
// can browse; a logged-in person who has not finished profile setup is sent
// to finish it first.
function OptionalAuthRoute() {
  const { currentUser, needsProfileSetup, loading } = useAuth();

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

  if (currentUser && needsProfileSetup) {
    return <Navigate to="/setup-profile" replace />;
  }

  return <Outlet />;
}

export default OptionalAuthRoute;
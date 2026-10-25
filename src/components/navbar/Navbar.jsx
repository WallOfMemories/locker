import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

function Navbar() {
  const { currentUser, profile, needsProfileSetup, loading } = useAuth();
  const { pathname } = useLocation();

  // Hidden while checking login, on the login pages and during profile setup.
  const onAuthPage = ["/login", "/register", "/forgot-password"].includes(
    pathname
  );

  if (loading || needsProfileSetup || (!currentUser && onAuthPage)) {
    return null;
  }

  // Visitors who are not logged in: logo + Log in / Sign up
  if (!currentUser) {
    return (
      <>
        <header className="navbar">
          <div className="container navbar__inner">
            <Link to="/" className="navbar__logo">
              SNAP<span>WALL</span>
            </Link>

            <div className="navbar__actions">
              <Link to="/login" className="navbar__login">
                Log in
              </Link>

              <Link to="/register" className="navbar__signup">
                Sign up
              </Link>
            </div>
          </div>
        </header>

        <div className="navbar-spacer" aria-hidden="true" />
      </>
    );
  }

  const name =
    profile?.displayName ||
    profile?.username ||
    currentUser.displayName ||
    currentUser.email?.split("@")[0] ||
    "there";

  const photoURL = profile?.photoURL || currentUser.photoURL;

  return (
    <>
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__logo">
          SNAP<span>WALL</span>
        </Link>

        <div className="navbar__actions">
          {/* CHANGED: the admin link used to say "Reports". The admin area now
              has its own sidebar (Dashboard, Reports, Payments, Wall Size). */}
          {profile?.role === "admin" && (
            <Link to="/admin/dashboard" className="navbar__admin">
              Admin
            </Link>
          )}

          <Link to="/profile" className="navbar__user">
            {photoURL ? (
              <img
                src={photoURL}
                alt={name}
                className="navbar__avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="navbar__avatar navbar__avatar--fallback">
                {name.charAt(0).toUpperCase()}
              </span>
            )}

            <span className="navbar__greeting">Hey, {name}</span>
          </Link>
        </div>
      </div>
    </header>

    {/* NEW: the navbar is now position: fixed (always pinned to the top), so
        it no longer takes up space in the page flow. This spacer holds that
        space so page content doesn't slide underneath it. */}
    <div className="navbar-spacer" aria-hidden="true" />
    </>
  );
}

export default Navbar;
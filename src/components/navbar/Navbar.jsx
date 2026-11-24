import { Link, useLocation } from "react-router-dom";
import { FiBell } from "react-icons/fi"; // NEW: notifications icon
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext"; // NEW
import "./Navbar.css";

function Navbar() {
  const { currentUser, profile, needsProfileSetup, loading } = useAuth();
  const { pathname } = useLocation();
  // NEW: unread notifications, for the bell badge
  const { unreadCount } = useNotifications();

  // Hidden while checking login, on the login pages and during profile setup.
  const onAuthPage = ["/login", "/register", "/forgot-password"].includes(
    pathname
  );

  if (loading || needsProfileSetup || (!currentUser && onAuthPage)) {
    return null;
  }

  // Visitors who are not logged in: logo + one "Log in" button
  if (!currentUser) {
    return (
      <>
        <header className="navbar">
          <div className="container navbar__inner">
            {/* NEW: logo + tagline stacked in one brand block */}
            <div className="navbar__brand">
              <Link to="/" className="navbar__logo">
                THE<span>LOCKER</span>
              </Link>
              <p className="navbar__tagline">LEAVE YOUR MEMORY ON THIS EARTH</p>
            </div>

            {/* CHANGED: "Log in" + "Sign up" side by side confused people, so
                there is ONE button now: "Log in". New people can still
                create an account from the link on the login page. */}
            <div className="navbar__actions">
              <Link to="/login" className="navbar__login">
                Log in
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
        {/* NEW: logo + tagline stacked in one brand block */}
        <div className="navbar__brand">
          <Link to="/" className="navbar__logo">
            THE<span>LOCKER</span>
          </Link>
          <p className="navbar__tagline">LEAVE YOUR MEMORY ON THIS EARTH</p>
        </div>

        <div className="navbar__actions">
          {/* CHANGED: the admin link used to say "Reports". The admin area now
              has its own sidebar (Dashboard, Reports, Payments, Wall Size). */}
          {profile?.role === "admin" && (
            <Link to="/admin/dashboard" className="navbar__admin">
              Admin
            </Link>
          )}

          {/* NEW: notifications bell. Tapping it opens the Notifications
              page; the red badge shows how many are unread. */}
          <Link
            to="/profile/notifications"
            className={`navbar__bell ${
              pathname.startsWith("/profile/notifications") ? "is-active" : ""
            }`}
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
            title="Notifications"
          >
            <FiBell />

            {unreadCount > 0 && (
              <span
                className={`navbar__bell-badge ${
                  unreadCount > 99 ? "navbar__bell-badge--wide" : ""
                }`}
                aria-hidden="true"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>

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
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiUser,
  FiCreditCard,
  FiBell,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";
import "./UserLayout.css";

// Nav config in one place so the markup below stays short.
// CHANGED: My Snaps / Time Capsules / Liked / Saved moved onto the Profile
// page as tabs (Instagram-style), so they are no longer sidebar items.
const NAV_ITEMS = [
  { to: "/profile", label: "Profile", icon: FiUser, end: true },
  { to: "/profile/payments", label: "Payment History", icon: FiCreditCard },
  { to: "/profile/notifications", label: "Notifications", icon: FiBell },
  { to: "/profile/settings", label: "Settings", icon: FiSettings },
];

function getInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function UserLayout() {
  const { logout, currentUser, profile } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  // NEW: user block at the bottom of the sidebar (same fallbacks as Navbar).
  const name =
    profile?.displayName ||
    profile?.username ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "User";
  const email = currentUser?.email || "";
  const photoURL = profile?.photoURL || currentUser?.photoURL;

  return (
    <main className="user-area">
      {/* CHANGED: removed the global "container" class — the layout is now
          full-width so the sidebar can sit flush against the left edge. */}
      <div className="user-layout">
        <aside className="user-sidebar">
          <nav className="user-sidebar__nav">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} title={label}>
                <Icon />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* NEW: footer pinned to the bottom — user info + logout */}
          <div className="user-sidebar__foot">
            <div className="user-sidebar__user">
              <span className="user-sidebar__avatar">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt={name}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  getInitials(name)
                )}
              </span>

              <div className="user-sidebar__who">
                <span className="user-sidebar__name">{name}</span>
                <span className="user-sidebar__email">{email}</span>
              </div>
            </div>

            <button
              type="button"
              className="user-sidebar__logout"
              onClick={handleLogout}
              title="Log out"
            >
              <FiLogOut />
              <span>Log out</span>
            </button>
          </div>
        </aside>

        <section className="user-content">
          <Outlet />
        </section>
      </div>
    </main>
  );
}

export default UserLayout;
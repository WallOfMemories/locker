import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiGrid,
  FiFlag,
  FiCreditCard,
  FiMaximize,
  FiArrowLeft,
  FiLogOut,
} from "react-icons/fi";

// The admin sidebar reuses the user sidebar's look (same classes), so the
// two areas feel like one app — but it is a separate layout with its own
// menu, shown only on /admin/* pages.
import "../user/UserLayout.css";
import "./AdminLayout.css";

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: FiGrid },
  { to: "/admin/reports", label: "Reports", icon: FiFlag },
  { to: "/admin/payments", label: "Payments", icon: FiCreditCard },
  { to: "/admin/wall", label: "Wall Size", icon: FiMaximize },
];

function getInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function AdminLayout() {
  const { logout, currentUser, profile } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const name =
    profile?.displayName ||
    profile?.username ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "Admin";
  const email = currentUser?.email || "";
  const photoURL = profile?.photoURL || currentUser?.photoURL;

  return (
    <main className="user-area admin-area">
      <div className="user-layout">
        <aside className="user-sidebar">
          <nav className="user-sidebar__nav">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} title={label}>
                <Icon />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="user-sidebar__foot">
            {/* Way back to the normal app */}
            <Link
              to="/"
              className="admin-sidebar__back"
              title="Back to SnapWall"
            >
              <FiArrowLeft />
              <span>Back to SnapWall</span>
            </Link>

            <div className="user-sidebar__user">
              <span className="user-sidebar__avatar">
                {photoURL ? (
                  <img src={photoURL} alt={name} referrerPolicy="no-referrer" />
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

export default AdminLayout;
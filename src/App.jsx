import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/navbar/Navbar";
import { AuthProvider } from "./context/AuthContext";

// Main pages
import SnapWall from "./pages/public/SnapWall";
import About from "./pages/public/About";

// Auth pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

// User pages
import UserLayout from "./pages/user/UserLayout";
import Profile from "./pages/user/Profile";
import EditProfile from "./pages/user/EditProfile";
import PaymentHistory from "./pages/user/PaymentHistory";
import Notifications from "./pages/user/Notifications";
import Settings from "./pages/user/Settings";
import CreateSnap from "./pages/user/CreateSnap";

// Admin pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminReports from "./pages/admin/AdminReports";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminWall from "./pages/admin/AdminWall";

// Onboarding
import SetupProfile from "./pages/onboarding/SetupProfile";

// Route guards
import ProtectedRoute from "./pages/auth/ProtectedRoute";
import PublicOnlyRoute from "./pages/auth/PublicOnlyRoute";
import AdminRoute from "./pages/auth/AdminRoute";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />

        <Routes>
          {/* AUTH (only when logged out) */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* PROFILE SETUP (logged in, profile not finished yet) */}
          <Route element={<ProtectedRoute allowIncomplete />}>
            <Route path="/setup-profile" element={<SetupProfile />} />
          </Route>

          {/* EVERYTHING ELSE requires login + finished profile */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<SnapWall />} />
            <Route path="/wall" element={<Navigate to="/" replace />} />
            <Route path="/about" element={<About />} />

            <Route element={<UserLayout />}>
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              {/* Old pages now live as tabs on /profile — keep old links working */}
              <Route path="/profile/snaps" element={<Navigate to="/profile" replace />} />
              <Route path="/profile/capsules" element={<Navigate to="/profile?tab=capsules" replace />} />
              <Route path="/profile/liked" element={<Navigate to="/profile?tab=liked" replace />} />
              <Route path="/profile/saved" element={<Navigate to="/profile?tab=saved" replace />} />
              <Route path="/profile/payments" element={<PaymentHistory />} />
              <Route path="/profile/notifications" element={<Notifications />} />
              <Route path="/profile/settings" element={<Settings />} />
              <Route path="/create-snap" element={<CreateSnap />} />
            </Route>
          </Route>

          {/* ADMIN (logged in + role "admin") — its own layout + sidebar */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="wall" element={<AdminWall />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
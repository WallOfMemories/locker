import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../services/firebase";
import { ensureUserDoc } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        let userProfile = null;

        if (user) {
          try {
            userProfile = await ensureUserDoc(user);
          } catch (error) {
            console.error(
              "Failed to load user profile:",
              error
            );
          }
        }

        setCurrentUser(user);
        setProfile(userProfile);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const refreshProfile = useCallback(async () => {
    const user = auth.currentUser;

    if (!user) return null;

    const snapshot = await getDoc(doc(db, "users", user.uid));

    const data = snapshot.exists()
      ? { id: snapshot.id, ...snapshot.data() }
      : null;

    setProfile(data);

    return data;
  }, []);

  const logout = () => signOut(auth);

  // New accounts have no username until profile setup is done.
  const needsProfileSetup = Boolean(
    currentUser && profile && !profile.username
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        loading,
        needsProfileSetup,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
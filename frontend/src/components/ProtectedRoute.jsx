import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../firebase";

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hasLocalAuth = localStorage.getItem("wayfinder_admin_auth") === "true";
    const hasStateAuth = Boolean(location.state && location.state.authorized);

    if (!auth || !isFirebaseConfigured) {
      if (hasStateAuth || hasLocalAuth) {
        localStorage.setItem("wayfinder_admin_auth", "true");
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
        navigate("/");
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user || hasStateAuth || hasLocalAuth) {
        localStorage.setItem("wayfinder_admin_auth", "true");
        setAuthenticated(true);
      } else {
        localStorage.removeItem("wayfinder_admin_auth");
        setAuthenticated(false);
        navigate("/");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate, location]);

  if (loading) return null;
  return authenticated ? children : null;
}

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { user, checked } = useAuth();
  const location = useLocation();

  if (!checked) {
    return <div className="p-20 text-center text-neutral-500">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === "donor" ? "/donor" : "/receiver"} replace />;
  }

  return children;
}

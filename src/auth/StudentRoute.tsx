import { Navigate, Outlet } from "react-router-dom";
import { isStudent } from "../api/types";
import { useAuth } from "./AuthContext";

export function StudentRoute() {
  const { user } = useAuth();

  if (!isStudent(user?.role)) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}

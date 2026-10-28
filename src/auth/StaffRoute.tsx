import { Navigate, Outlet } from "react-router-dom";
import { isStaff } from "../api/types";
import { useAuth } from "./AuthContext";

export function StaffRoute() {
  const { user } = useAuth();

  if (!isStaff(user?.role)) {
    return <Navigate to="/alumno/inicio" replace />;
  }

  return <Outlet />;
}

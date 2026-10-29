import { NavLink, Outlet } from "react-router-dom";
import { homePath, isStaff, isStudent } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useGymBrand } from "../auth/GymBrand";
import { UserMenu } from "./UserMenu";
import { APP_VERSION } from "../version";

export function AppShell() {
  const { user } = useAuth();
  const gym = useGymBrand();
  const isAdmin = user?.role === "ADMIN";
  const staff = isStaff(user?.role);
  const student = isStudent(user?.role);

  return (
    <div className="app-shell">
      <header className="app-nav">
        <NavLink to={homePath(user?.role)} className="app-brand">
          <strong>{gym?.name || "Gimnasio"}</strong>
        </NavLink>
        <nav className="app-links">
          {student ? (
            <>
              <NavLink to="/alumno/inicio">Inicio</NavLink>
              <NavLink to="/alumno/mis-rutinas">Mis rutinas</NavLink>
              <NavLink to="/alumno/progreso">Progreso</NavLink>
              <NavLink to="/cronometro">Cronómetro</NavLink>
            </>
          ) : null}
          {staff ? (
            <>
              <NavLink to="/app" end>
                Inicio
              </NavLink>
              <NavLink to="/admin/alumnos">Alumnos</NavLink>
              <NavLink to="/admin/pendientes">Pendientes</NavLink>
              <NavLink to="/admin/ejercicios">Ejercicios</NavLink>
              <NavLink to="/admin/rutinas">Rutinas</NavLink>
              {user?.role === "PROFESOR" ? <NavLink to="/cronometro">Cronómetro</NavLink> : null}
            </>
          ) : null}
          {isAdmin ? <NavLink to="/app/users">Usuarios</NavLink> : null}
          {staff ? <NavLink to="/admin/horarios">Plataforma</NavLink> : null}
          {isAdmin ? (
            <NavLink to="/app/settings" title="Configuración del sistema">
              Sistema
            </NavLink>
          ) : null}
        </nav>
        <UserMenu />
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <p className="app-version">Versión {APP_VERSION}</p>
    </div>
  );
}

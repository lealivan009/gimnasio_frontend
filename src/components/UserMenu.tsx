import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { displayName, roleLabel, type User } from "../api/types";
import { useAuth } from "../auth/AuthContext";

function initials(user: User) {
  const a = user.firstName?.trim()?.[0] ?? "";
  const b = user.lastName?.trim()?.[0] ?? "";
  const value = `${a}${b}`.toUpperCase();
  return value || user.email.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return null;
  }

  async function onLogout() {
    setOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={`user-menu${open ? " open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="avatar" aria-hidden>
          {initials(user)}
        </span>
        <span className="user-menu-copy">
          <strong>{displayName(user)}</strong>
          <small>{roleLabel(user.role)}</small>
        </span>
        <span className="user-menu-caret" aria-hidden />
      </button>

      {open ? (
        <div className="user-menu-panel" role="menu">
          <div className="user-menu-head">
            <span className="avatar lg" aria-hidden>
              {initials(user)}
            </span>
            <div>
              <strong>{displayName(user)}</strong>
              <p>{user.email}</p>
            </div>
          </div>
          <Link role="menuitem" to="/app/profile" onClick={() => setOpen(false)}>
            Mi perfil
          </Link>
          <Link role="menuitem" to="/app/account" onClick={() => setOpen(false)}>
            Cuenta y seguridad
          </Link>
          <button type="button" role="menuitem" className="user-menu-danger" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}

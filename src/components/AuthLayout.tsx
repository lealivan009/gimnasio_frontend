import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useGymBrand } from "../auth/GymBrand";

export function AuthLayout({ children }: { children: ReactNode }) {
  const gym = useGymBrand();
  const name = gym?.name || "Gimnasio";

  return (
    <div className="auth-gate">
      <Link className="auth-gate-back" to="/">
        {name}
      </Link>
      {children}
    </div>
  );
}

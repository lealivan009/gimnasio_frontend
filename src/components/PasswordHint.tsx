import { useEffect, useState } from "react";
import { api } from "../api/client";
import { passwordPolicyHint, type PublicSettings } from "../api/types";

const fallbackHint = "Mínimo 8 caracteres, con mayúscula, minúscula y un número.";

export function PasswordHint() {
  const [hint, setHint] = useState(fallbackHint);

  useEffect(() => {
    let cancelled = false;
    api
      .getPublicSettings()
      .then((settings: PublicSettings) => {
        if (!cancelled) {
          setHint(passwordPolicyHint(settings));
        }
      })
      .catch(() => {
        // keep fallback
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <p className="hint">{hint.charAt(0).toUpperCase() + hint.slice(1)}.</p>;
}

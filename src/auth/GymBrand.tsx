import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { PublicGym } from "../api/gym";

const GymBrandContext = createContext<{ gym: PublicGym | null; refresh: () => Promise<void> }>({
  gym: null,
  refresh: async () => undefined,
});

export function useGymBrand() {
  return useContext(GymBrandContext).gym;
}

export function useRefreshGymBrand() {
  return useContext(GymBrandContext).refresh;
}

export function GymBrandProvider({ children }: { children: ReactNode }) {
  const [gym, setGym] = useState<PublicGym | null>(null);

  const refresh = useCallback(async () => {
    try {
      setGym(await api.getPublicGym());
    } catch {
      // La pantalla sigue usable si el gimnasio todavía no responde.
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    document.documentElement.dataset.theme = (gym?.theme ?? "ENERGIA").toLowerCase();
  }, [gym]);

  return <GymBrandContext.Provider value={{ gym, refresh }}>{children}</GymBrandContext.Provider>;
}

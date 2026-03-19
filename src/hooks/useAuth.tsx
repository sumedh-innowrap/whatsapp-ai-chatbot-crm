import { useEffect, useState } from "react";

export interface AuthUser {
  email: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("crm_token");
    const email = localStorage.getItem("crm_email");
    if (token && email) setUser({ email });
    setLoading(false);
  }, []);

  return { user, loading };
}

export function saveAuth(token: string, email: string) {
  localStorage.setItem("crm_token", token);
  localStorage.setItem("crm_email", email);
}

export function clearAuth() {
  localStorage.removeItem("crm_token");
  localStorage.removeItem("crm_email");
}

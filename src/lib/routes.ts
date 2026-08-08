import type { PapelUsuario } from "@/types/auth";

export function homeForRole(role: PapelUsuario) {
  if (role === "ADMIN_GLOBAL") return "/admin-global";
  if (role === "ADMIN_EMPRESA") return "/empresa";
  return "/projetos";
}

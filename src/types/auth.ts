export type PapelUsuario = "ADMIN_GLOBAL" | "ADMIN_EMPRESA" | "USUARIO";

export interface AuthenticatedUser {
  id: string;
  empresaId: string | null;
  nome: string;
  email: string;
  papel: PapelUsuario;
  ativo: boolean;
  deveAlterarSenha: boolean;
  sessaoId: string;
}

export interface AuthResponse {
  accessToken: string;
  usuario: AuthenticatedUser;
}

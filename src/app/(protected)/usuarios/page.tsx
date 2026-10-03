"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { PageMessage } from "@/components/page-message";
import { RoleGate } from "@/components/role-gate";
import { Button, Checkbox, Input, ListRow, RowList, Select } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { notifySuccess } from "@/lib/toast";
import { errorMessage } from "@/lib/work";
import type {
  CompanyUser,
  Paginated,
  Project,
  ProjectPermission,
  ProjectUserLink,
} from "@/types/domain";

const PERMISSION_OPTIONS = [
  { value: "VISUALIZAR", label: "Visualizar" },
  { value: "EDITAR", label: "Editar" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [links, setLinks] = useState<ProjectUserLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const commonUsers = useMemo(
    () => users.filter((user) => user.papel === "USUARIO" && user.ativo),
    [users],
  );

  const loadBase = useCallback(
    () =>
      Promise.all([
        apiFetch<Paginated<CompanyUser>>("/usuarios?limite=100&ativo=true"),
        apiFetch<Project[]>("/projetos?status=ATIVO"),
      ]),
    [],
  );

  useEffect(() => {
    let active = true;
    loadBase()
      .then(([userData, projectData]) => {
        if (active) {
          setUsers(userData.dados);
          setProjects(projectData);
        }
      })
      .catch((caught: unknown) => active && setError(errorMessage(caught)));
    return () => {
      active = false;
    };
  }, [loadBase]);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    apiFetch<ProjectUserLink[]>(`/projetos/${projectId}/usuarios`)
      .then((data) => active && setLinks(data))
      .catch((caught: unknown) => active && setError(errorMessage(caught)));
    return () => {
      active = false;
    };
  }, [projectId]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const selectedProject = String(data.get("projetoId") || "");
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/usuarios", {
        method: "POST",
        body: JSON.stringify({
          nome: data.get("nome"),
          email: data.get("email"),
          papel: "USUARIO",
          senhaTemporaria: data.get("senha"),
          projetos: [{ projetoId: selectedProject, permissao: data.get("permissao") }],
        }),
      });
      const [userData, projectData] = await loadBase();
      setUsers(userData.dados);
      setProjects(projectData);
      form.reset();
      notifySuccess("Usuário criado e vinculado ao projeto.");
      if (projectId === selectedProject) {
        setLinks(await apiFetch(`/projetos/${projectId}/usuarios`));
      }
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function updateAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;
    const data = new FormData(event.currentTarget);
    const selectedIds = data.getAll("usuarioId").map(String);
    const currentIds = new Set(links.map((link) => link.usuario.id));
    const removedIds = [...currentIds].filter((id) => !selectedIds.includes(id));
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/projetos/${projectId}/usuarios`, {
        method: "PUT",
        body: JSON.stringify({
          usuarios: selectedIds.map((usuarioId) => ({
            usuarioId,
            permissao: data.get(`permissao-${usuarioId}`) as ProjectPermission,
          })),
          ...(data.get("confirmarRemocoes")
            ? { confirmarDesativacaoUsuarioIds: removedIds }
            : {}),
        }),
      });
      setLinks(await apiFetch(`/projetos/${projectId}/usuarios`));
      notifySuccess("Permissões atualizadas.");
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  const linked = new Map(links.map((link) => [link.usuario.id, link.permissao]));

  return (
    <RoleGate allow={["ADMIN_EMPRESA"]}>
      <AppShell>
        <p className="text-sm font-semibold text-primary">Administração</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Usuários e acessos</h1>

        {error && (
          <div className="mt-6">
            <PageMessage message={error} />
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-bold">Novo usuário</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O primeiro projeto é obrigatório; outros acessos podem ser adicionados abaixo.
          </p>
          <form
            onSubmit={createUser}
            className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            <Input name="nome" label="Nome" required minLength={2} />
            <Input name="email" label="E-mail" required type="email" />
            <Input
              name="senha"
              label="Senha temporária"
              required
              type="password"
              minLength={8}
            />
            <Select
              name="projetoId"
              label="Projeto"
              required
              placeholder="Selecione"
              options={projects.map((project) => ({
                value: project.id,
                label: project.nome,
              }))}
            />
            <Select
              name="permissao"
              label="Permissão"
              defaultValue="VISUALIZAR"
              placeholder={null}
              options={PERMISSION_OPTIONS}
            />
            <Button
              type="submit"
              disabled={saving || projects.length === 0}
              className="justify-self-end sm:col-span-2 lg:col-span-5"
            >
              {saving ? "Salvando..." : "Criar usuário"}
            </Button>
          </form>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-bold">Permissões por projeto</h2>

          <div className="mt-5 max-w-md">
            <Select
              label="Projeto"
              placeholder="Selecione"
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value);
                setLinks([]);
              }}
              options={projects.map((project) => ({
                value: project.id,
                label: project.nome,
              }))}
            />
          </div>

          {projectId && (
            <form onSubmit={updateAccess} className="mt-6">
              {commonUsers.length === 0 ? (
                <EmptyState>Nenhum usuário ativo disponível.</EmptyState>
              ) : (
                <RowList>
                  {commonUsers.map((user) => (
                    <ListRow
                      key={user.id}
                      title={user.nome}
                      detail={user.email}
                      meta={
                        <div className="flex items-center gap-4">
                          <Checkbox
                            key={`${projectId}-${user.id}-${linked.has(user.id)}`}
                            name="usuarioId"
                            value={user.id}
                            defaultChecked={linked.has(user.id)}
                            label="Vinculado"
                          />
                          <Select
                            key={`${projectId}-${user.id}-${linked.get(user.id) ?? ""}`}
                            name={`permissao-${user.id}`}
                            defaultValue={linked.get(user.id) ?? "VISUALIZAR"}
                            placeholder={null}
                            className="w-40"
                            options={PERMISSION_OPTIONS}
                          />
                        </div>
                      }
                    />
                  ))}
                </RowList>
              )}

              <div className="mt-5 rounded-lg border border-warning-100 bg-warning-50 px-4 py-3">
                <Checkbox
                  name="confirmarRemocoes"
                  label="Confirmo a desativação de usuários que perderem seu último projeto."
                  className="text-warning-800"
                />
              </div>

              <div className="mt-5 flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar permissões"}
                </Button>
              </div>
            </form>
          )}
        </section>
      </AppShell>
    </RoleGate>
  );
}

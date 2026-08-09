import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sistema de Catalogação",
    short_name: "Catálogo",
    description: "Gestão segura de projetos e acervos empresariais.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#6b0101",
    lang: "pt-BR",
  };
}

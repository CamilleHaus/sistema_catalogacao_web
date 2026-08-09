export interface Company {
  id: string;
  nome: string;
  criadoEm: string;
  atualizadoEm: string;
  _count: { usuarios: number; projetos: number };
}

export interface Project {
  id: string;
  empresaId: string;
  nome: string;
  status: "ATIVO" | "ARQUIVADO";
  criadoEm: string;
  atualizadoEm: string;
  _count?: { usuarios: number };
  permissao?: ProjectPermission;
  cliente: Pick<Client, "id" | "nome" | "codigo">;
}

export interface Client {
  id: string;
  empresaId: string;
  nome: string;
  descricao: string | null;
  codigo: string;
  criadoEm: string;
  atualizadoEm: string;
  _count?: { projetos: number };
}

export interface CompanyUser {
  id: string;
  empresaId: string | null;
  nome: string;
  email: string;
  cpfMascarado?: string | null;
  papel: "ADMIN_GLOBAL" | "ADMIN_EMPRESA" | "USUARIO";
  ativo: boolean;
  deveAlterarSenha: boolean;
  criadoEm: string;
  atualizadoEm: string;
  _count?: { projetos: number };
  empresa?: { id: string; nome: string } | null;
}

export interface ProjectUserLink {
  criadoEm: string;
  permissao: ProjectPermission;
  usuario: CompanyUser;
}

export interface Paginated<T> {
  dados: T[];
  paginacao: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
}
export type ProjectPermission = "VISUALIZAR" | "EDITAR";

export interface Artist {
  id: string;
  nome: string;
  localNascimento: string | null;
  anoNascimento: number | null;
  localFalecimento: string | null;
  anoFalecimento: number | null;
}

export interface WorkStatus { id: string; nome: string; }

export interface Technique {
  id: string;
  nome: string;
  projetoId: string | null;
  projeto: { id: string; nome: string } | null;
}

export interface LocationNode {
  id: string;
  projetoId: string;
  nome: string;
  paiId: string | null;
  filhos: LocationNode[];
}

export interface Work {
  id: string;
  projetoId: string;
  numeroManual: string;
  codigoAcervo: string;
  titulo: string | null;
  tituloExibicao: string;
  edicao: string | null;
  data: string | null;
  fotoPrincipalUrl: string | null;
  fotoPrincipalCreditos: string | null;
  status: WorkStatus | null;
  tecnica: Pick<Technique, "id" | "nome" | "projetoId"> | null;
  localizacao: { id: string; nome: string; paiId: string | null } | null;
  artistas: Artist[];
  dimensoes: WorkDimension[];
}

export interface WorkImage {
  id: string; imagemUrl: string; creditos: string | null; observacoes: string | null;
  principal: boolean; criadoEm: string; atualizadoEm: string;
}
export interface GallerySignature {
  id: string; imagemUrl: string; criadoEm: string;
  localAssinatura: SignatureLocation;
}
export interface WorkGallery { imagens: WorkImage[]; assinaturas: GallerySignature[]; }
export type AttachmentType = "IMAGEM" | "PDF" | "DOCUMENTO" | "PLANILHA" | "APRESENTACAO" | "AUDIO" | "VIDEO" | "OUTRO";
export interface WorkAttachment {
  id: string; arquivoUrl: string; tipo: AttachmentType; observacoes: string | null;
  extensao: string | null; criadoEm: string; atualizadoEm: string;
}

export interface WorkDimension {
  id: string;
  tipo: "SEM_MOLDURA" | "COM_MOLDURA";
  formato: "NUMERICA" | "VARIAVEL";
  altura: number | null;
  largura: number | null;
  profundidade: number | null;
  unidade: "CM" | "IN" | null;
  descricaoVariavel: string | null;
  conversao?: {
    altura: { valor: number; unidade: "CM" | "IN" };
    largura: { valor: number; unidade: "CM" | "IN" };
    profundidade: { valor: number; unidade: "CM" | "IN" } | null;
  };
}

export interface CatalogCategory { id: string; nome: string; }
export interface CatalogTag { id: string; nome: string; cor: string | null; }
export interface SignatureLocation { id: string; nome: string; }
export interface Cataloging {
  id: string; obraId: string; proveniencia: string | null; observacoes: string | null;
  categoria: CatalogCategory | null; tags: CatalogTag[];
  assinaturas: { id: string; imagemUrl: string | null; localAssinatura: SignatureLocation }[];
  certificados: { id: string; imagemUrl: string; observacoes: string | null }[];
}

export interface WorkResearch {
  curriculos: WorkCurriculum[];
  publicacoes: WorkPublication[];
  pesquisasMuseologicas: MuseumResearch[];
}
export interface WorkCurriculum {
  id: string; obraId: string; nomeExposicao: string | null; instituicao: string | null;
  cidade: string | null; pais: string | null; data: string | null; criadoEm: string; atualizadoEm: string;
}
export interface WorkPublication {
  id: string; obraId: string; titulo: string | null; ano: number | null; autor: string | null;
  editora: string | null; pagina: string | null; criadoEm: string; atualizadoEm: string;
  imagens: { id: string; imagemUrl: string; criadoEm: string }[];
}
export interface MuseumResearch {
  id: string; obraId: string; titulo: string | null; descricao: string | null;
  url: string | null; criadoEm: string; atualizadoEm: string;
}
export type Currency = "BRL" | "USD" | "EUR" | "GBP";
export interface NamedReference { id: string; nome: string; }
export interface FinancialDocument { id: string; imagemUrl: string | null; numero?: string | null; data: string | null; moeda: Currency | null; valor: string | null; comentarios: string | null; }
export interface FinancialOperation { id: string; formaNegociacao: NamedReference | null; formaNegociacaoId: string | null; data: string | null; adquiridoDe?: string | null; vendidoPara?: string | null; moeda: Currency | null; valor: string | null; tipoDesconto: "VALOR_FIXO" | "PERCENTUAL" | null; desconto: string | null; valorFinal: string | null; notasFiscais?: FinancialDocument[]; comprovantes: FinancialDocument[]; }
export interface FinancialEvaluation { id: string; data: string | null; moeda: Currency | null; valor: string | null; avaliador: string | null; comentarios: string | null; }
export interface WorkInsurance { id: string; vigencia: string | null; moeda: Currency | null; valor: string | null; modalidadeSeguroId: string | null; modalidadeSeguro: NamedReference | null; observacoes: string | null; }
export interface WorkFinancial { aquisicao: FinancialOperation | null; venda: FinancialOperation | null; avaliacoes: FinancialEvaluation[]; seguros: WorkInsurance[]; }

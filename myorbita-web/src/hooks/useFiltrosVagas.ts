import { useState, useMemo, useEffect } from 'react';
import type { IVaga } from '../types/IVaga';

/**
 * Normaliza texto removendo acentos, convertendo para minúsculas e removendo espaços extras.
 * Usado para comparações de busca case/accent-insensitive.
 */
const normalizarTexto = (texto: string): string => {
  if (!texto) return "";
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

/**
 * Verifica se um campo opcional do backend tem valor útil.
 * Campos vazios ou "Não informado" são tratados como ausentes.
 */
const campoPreenchido = (valor?: string): boolean => {
  return !!valor && valor !== "Não informado";
};

/**
 * Descreve cada filtro ativo individualmente.
 * Usado para chips removíveis, contador e empty state inteligente.
 */
export type FiltroAtivo = {
  nome: string;
  limpar: () => void;
};

export function useFiltrosVagas(vagasIniciais: IVaga[]) {
  // --- Estados dos filtros ---
  const [busca, setBusca] = useState("");
  const [filtroModalidade, setFiltroModalidade] = useState<string | null>(null);
  const [ordenacao, setOrdenacao] = useState<"recente" | "antiga">("recente");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroNivel, setFiltroNivel] = useState<string>("todos");
  const [filtroContrato, setFiltroContrato] = useState<string>("todos");
  const [filtroPcd, setFiltroPcd] = useState<boolean>(false);
  const [filtroOrigem, setFiltroOrigem] = useState<string>("todas");
  const [paginaAtual, setPaginaAtual] = useState(1);

  const VAGAS_POR_PAGINA = 9;

  // --- Extrair estados únicos das vagas para popular o select dinamicamente ---
  const estadosDisponiveis = useMemo(() => {
    const estados = new Set<string>();
    vagasIniciais.forEach((v) => {
      if (campoPreenchido(v.state)) estados.add(v.state!);
    });
    return Array.from(estados).sort();
  }, [vagasIniciais]);

  // --- Extrair tipos de contrato únicos ---
  const contratosDisponiveis = useMemo(() => {
    const contratos = new Set<string>();
    vagasIniciais.forEach((v) => {
      if (campoPreenchido(v.tipo_contrato)) contratos.add(v.tipo_contrato!);
    });
    return Array.from(contratos).sort();
  }, [vagasIniciais]);

  // --- Extrair origens únicas (Gupy, LinkedIn, etc) ---
  const origensDisponiveis = useMemo(() => {
    const origens = new Set<string>();
    vagasIniciais.forEach((v) => {
      if (campoPreenchido(v.origem)) origens.add(v.origem);
    });
    return Array.from(origens).sort();
  }, [vagasIniciais]);

  // --- Pipeline de filtragem ---
  const vagasFiltradas = useMemo(() => {
    let resultado = [...vagasIniciais];

    // 1. Busca textual inteligente (multi-termo, ignora acentos e case)
    if (busca.trim()) {
      const termosBusca = normalizarTexto(busca).split(/\s+/);
      resultado = resultado.filter((vaga) => {
        const textoVaga = normalizarTexto(
          `${vaga.titulo} ${vaga.empresa} ${vaga.city || ""} ${vaga.state || ""} ${vaga.tipo_contrato || ""}`
        );
        return termosBusca.every((termo) => textoVaga.includes(termo));
      });
    }

    // 2. Filtro de modalidade
    if (filtroModalidade) {
      resultado = resultado.filter((v) =>
        normalizarTexto(v.modalidade).includes(normalizarTexto(filtroModalidade))
      );
    }

    // 3. Filtro de nível hierárquico
    if (filtroNivel !== "todos") {
      resultado = resultado.filter((v) => {
        const titulo = normalizarTexto(v.titulo);
        switch (filtroNivel) {
          case "estagio":
            return titulo.includes("estagio") || titulo.includes("intern") || titulo.includes("aprendiz");
          case "junior":
            return titulo.includes("junior") || titulo.includes("jr") || titulo.includes("i ");
          case "pleno":
            return titulo.includes("pleno") || titulo.includes("mid") || titulo.includes("ii ");
          case "senior":
            return titulo.includes("senior") || titulo.includes("sr") || titulo.includes("iii ");
          default:
            return true;
        }
      });
    }

    // 4. Filtro por estado (UF)
    if (filtroEstado !== "todos") {
      resultado = resultado.filter((v) => v.state === filtroEstado);
    }

    // 5. Filtro por tipo de contrato
    if (filtroContrato !== "todos") {
      resultado = resultado.filter((v) => v.tipo_contrato === filtroContrato);
    }

    // 6. Filtro PCD
    if (filtroPcd) {
      resultado = resultado.filter((v) => v.pcd === true);
    }

    // 7. Filtro por origem
    if (filtroOrigem !== "todas") {
      const origemNormalizada = filtroOrigem.toLowerCase();
      resultado = resultado.filter((v) => v.origem?.toLowerCase() === origemNormalizada);
    }

    // 8. Ordenação por data de publicação
    resultado.sort((a, b) => {
      const dA = new Date(a.data_publicacao || 0).getTime();
      const dB = new Date(b.data_publicacao || 0).getTime();
      return ordenacao === "recente" ? dB - dA : dA - dB;
    });

    return resultado;
  }, [vagasIniciais, busca, filtroModalidade, ordenacao, filtroEstado, filtroNivel, filtroContrato, filtroPcd, filtroOrigem]);

  // --- Reset de página ao alterar qualquer filtro ---
  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, filtroModalidade, ordenacao, filtroEstado, filtroNivel, filtroContrato, filtroPcd, filtroOrigem]);

  // --- Paginação ---
  const totalPaginas = Math.max(1, Math.ceil(vagasFiltradas.length / VAGAS_POR_PAGINA));

  const vagasPagina = useMemo(() => {
    const inicio = (paginaAtual - 1) * VAGAS_POR_PAGINA;
    const fim = inicio + VAGAS_POR_PAGINA;
    return vagasFiltradas.slice(inicio, fim);
  }, [vagasFiltradas, paginaAtual]);

  const paginasVisiveis = () => {
    const pages: number[] = [];
    for (let i = Math.max(1, paginaAtual - 2); i <= Math.min(totalPaginas, paginaAtual + 2); i++) {
      pages.push(i);
    }
    return pages;
  };

  // ============================================================
  // Metadados de filtragem — usados pela UI para:
  //   1) Contador "X filtros aplicados"
  //   2) Chips removíveis mostrando cada filtro ativo
  //   3) Empty state inteligente sugerindo qual filtro soltar
  //   4) Botão "Limpar filtros" que reseta tudo de uma vez
  // ============================================================
  const filtrosAtivos: FiltroAtivo[] = useMemo(() => {
    const lista: FiltroAtivo[] = [];

    if (busca.trim()) {
      lista.push({ nome: `"${busca.trim()}"`, limpar: () => setBusca("") });
    }
    if (filtroModalidade) {
      lista.push({ nome: filtroModalidade, limpar: () => setFiltroModalidade(null) });
    }
    if (filtroNivel !== "todos") {
      const mapNivel: Record<string, string> = {
        estagio: "Estágio",
        junior: "Júnior",
        pleno: "Pleno",
        senior: "Sênior",
      };
      lista.push({ nome: mapNivel[filtroNivel] ?? filtroNivel, limpar: () => setFiltroNivel("todos") });
    }
    if (filtroEstado !== "todos") {
      lista.push({ nome: filtroEstado, limpar: () => setFiltroEstado("todos") });
    }
    if (filtroContrato !== "todos") {
      lista.push({ nome: filtroContrato, limpar: () => setFiltroContrato("todos") });
    }
    if (filtroPcd) {
      lista.push({ nome: "PCD", limpar: () => setFiltroPcd(false) });
    }
    if (filtroOrigem !== "todas") {
      lista.push({ nome: filtroOrigem, limpar: () => setFiltroOrigem("todas") });
    }

    return lista;
  }, [busca, filtroModalidade, filtroNivel, filtroEstado, filtroContrato, filtroPcd, filtroOrigem]);

  const totalFiltrosAtivos = filtrosAtivos.length;

  /**
   * Reseta todos os filtros para o estado inicial de uma vez só.
   */
  const limparFiltros = () => {
    setBusca("");
    setFiltroModalidade(null);
    setFiltroNivel("todos");
    setFiltroEstado("todos");
    setFiltroContrato("todos");
    setFiltroPcd(false);
    setFiltroOrigem("todas");
  };

  return {
    // Busca
    busca, setBusca,
    // Filtros
    filtroModalidade, setFiltroModalidade,
    ordenacao, setOrdenacao,
    filtroEstado, setFiltroEstado,
    filtroNivel, setFiltroNivel,
    filtroContrato, setFiltroContrato,
    filtroPcd, setFiltroPcd,
    filtroOrigem, setFiltroOrigem,
    // Dados dinâmicos
    estadosDisponiveis,
    contratosDisponiveis,
    origensDisponiveis,
    // Paginação
    paginaAtual, setPaginaAtual,
    vagasFiltradas, vagasPagina, totalPaginas, paginasVisiveis,
    // Metadados de filtragem
    filtrosAtivos,
    totalFiltrosAtivos,
    limparFiltros,
  };
}
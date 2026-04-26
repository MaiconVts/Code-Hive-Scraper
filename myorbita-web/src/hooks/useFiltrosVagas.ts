import { useState, useMemo, useEffect } from 'react';
import type { IVaga } from '../types/IVaga';

/**
 * Sentinelas de "valor ausente" usados pelo scraper quando não consegue extrair
 * o dado. Qualquer campo com um destes valores é tratado como sujeira semântica:
 * não entra na busca textual e recebe tratamento permissivo nos filtros
 * (vaga com campo sujo passa em QUALQUER seleção daquele filtro).
 *
 * Por que "Brasil" entra aqui?
 * Quando o LinkedIn retorna localização só como "Brasil" sem cidade/UF,
 * o parser joga "Brasil" no campo state por falta de alternativa melhor.
 * Isso é bug conhecido do scraper e enquanto não corrigimos lá, tratamos
 * como "estado desconhecido" aqui.
 */
const VALORES_AUSENTES = new Set(["", "Não informado", "Brasil"]);

/**
 * Testa se o valor do campo representa "ausência de dado".
 * Função utilitária local — não exportada para evitar acoplamento entre módulos.
 * VagasDev e VagasAdv têm a sua própria cópia para detecção visual no card.
 */
const estaAusente = (valor?: string): boolean => {
  if (!valor) return true;
  return VALORES_AUSENTES.has(valor.trim());
};

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
 * Limpa o valor de um campo antes de concatenar na string de busca.
 * Retorna string vazia se o campo estiver ausente — evita que "Não informado"
 * polua a busca textual (usuário que digitasse "informado" pegava vagas sujas).
 */
const limparParaBusca = (valor?: string): string => {
  return estaAusente(valor) ? "" : valor!;
};

/**
 * Regex de detecção de nível no título da vaga.
 * Word boundaries (\b) evitam matches parciais.
 * Se o título não bate em NENHUMA, a vaga é "nível indefinido" e passa em qualquer filtro.
 */
const REGEX_NIVEL: Record<string, RegExp> = {
  estagio: /\b(estagio|intern|aprendiz|trainee)\b/,
  junior: /\b(junior|jr)\b/,
  pleno: /\b(pleno|mid|middle)\b/,
  senior: /\b(senior|sr|lead|principal|staff)\b/,
};

/**
 * Detecta se o título menciona QUALQUER nível.
 * Vagas sem nível explícito aparecem em qualquer filtro de nível ativo.
 */
const tituloMencionaAlgumNivel = (tituloNormalizado: string): boolean => {
  return Object.values(REGEX_NIVEL).some((regex) => regex.test(tituloNormalizado));
};

/**
 * Descreve cada filtro ativo individualmente.
 * Cada item de array de filtro multi-select vira UM chip independente.
 */
export type FiltroAtivo = {
  nome: string;
  limpar: () => void;
};

export function useFiltrosVagas(vagasIniciais: IVaga[]) {
  // --- Estados dos filtros ---
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<"recente" | "antiga">("recente");

  // Multi-select: cada array representa opções ativas. Array vazio = sem filtro.
  const [filtrosModalidade, setFiltrosModalidade] = useState<string[]>([]);
  const [filtrosNivel, setFiltrosNivel] = useState<string[]>([]);
  const [filtrosEstado, setFiltrosEstado] = useState<string[]>([]);
  const [filtrosContrato, setFiltrosContrato] = useState<string[]>([]);
  const [filtrosOrigem, setFiltrosOrigem] = useState<string[]>([]);

  // PCD continua toggle (boolean não tem caso ausente separável de false)
  const [filtroPcd, setFiltroPcd] = useState<boolean>(false);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const VAGAS_POR_PAGINA = 9;

  // --- Extrair estados únicos das vagas para popular o dropdown dinamicamente ---
  // Valores ausentes ("Não informado", "Brasil", vazio) NÃO aparecem no dropdown,
  // mas vagas com esses valores ainda aparecem nos resultados via permissividade.
  const estadosDisponiveis = useMemo(() => {
    const estados = new Set<string>();
    vagasIniciais.forEach((v) => {
      if (!estaAusente(v.state)) estados.add(v.state!);
    });
    return Array.from(estados).sort();
  }, [vagasIniciais]);

  const contratosDisponiveis = useMemo(() => {
    const contratos = new Set<string>();
    vagasIniciais.forEach((v) => {
      if (!estaAusente(v.tipo_contrato)) contratos.add(v.tipo_contrato!);
    });
    return Array.from(contratos).sort();
  }, [vagasIniciais]);

  // Origem é sempre preenchida pelo scraper — sem permissividade aqui.
  const origensDisponiveis = useMemo(() => {
    const origens = new Set<string>();
    vagasIniciais.forEach((v) => {
      if (v.origem && v.origem.trim()) origens.add(v.origem);
    });
    return Array.from(origens).sort();
  }, [vagasIniciais]);

  // --- Pipeline de filtragem ---
  //
  // Lógica de combinação:
  // - DENTRO do mesmo filtro → OR ("MG ou SP ou RJ")
  // - ENTRE filtros diferentes → AND
  //
  // PERMISSIVIDADE em campos sujeiráveis:
  // Vagas com campo ausente passam em QUALQUER seleção daquele filtro.
  // Aplicada em: modalidade, estado, contrato, nível.
  // NÃO aplicada em: PCD (boolean), origem (sempre preenchida).
  const vagasFiltradas = useMemo(() => {
    let resultado = [...vagasIniciais];

    // 1. Busca textual (multi-termo, AND entre termos, ignora acentos/case)
    if (busca.trim()) {
      const termosBusca = normalizarTexto(busca).split(/\s+/);
      resultado = resultado.filter((vaga) => {
        const textoVaga = normalizarTexto(
          [
            vaga.titulo || "",
            vaga.empresa || "",
            limparParaBusca(vaga.city),
            limparParaBusca(vaga.state),
            limparParaBusca(vaga.tipo_contrato),
            limparParaBusca(vaga.modalidade),
          ].join(" ")
        );
        return termosBusca.every((termo) => textoVaga.includes(termo));
      });
    }

    // 2. Modalidade (multi-select OR + permissivo)
    if (filtrosModalidade.length > 0) {
      const modsNorm = filtrosModalidade.map(normalizarTexto);
      resultado = resultado.filter((v) => {
        if (estaAusente(v.modalidade)) return true;
        const modVaga = normalizarTexto(v.modalidade);
        return modsNorm.some((m) => modVaga.includes(m));
      });
    }

    // 3. Nível hierárquico (multi-select OR + permissivo via título)
    if (filtrosNivel.length > 0) {
      resultado = resultado.filter((v) => {
        const titulo = normalizarTexto(v.titulo);
        if (!tituloMencionaAlgumNivel(titulo)) return true;
        return filtrosNivel.some((nivel) => {
          const regex = REGEX_NIVEL[nivel];
          return regex ? regex.test(titulo) : false;
        });
      });
    }

    // 4. Estado/UF (multi-select OR + permissivo)
    if (filtrosEstado.length > 0) {
      resultado = resultado.filter((v) => {
        if (estaAusente(v.state)) return true;
        return filtrosEstado.includes(v.state!);
      });
    }

    // 5. Tipo de contrato (multi-select OR + permissivo)
    if (filtrosContrato.length > 0) {
      resultado = resultado.filter((v) => {
        if (estaAusente(v.tipo_contrato)) return true;
        return filtrosContrato.includes(v.tipo_contrato!);
      });
    }

    // 6. PCD (toggle boolean — SEM permissividade)
    if (filtroPcd) {
      resultado = resultado.filter((v) => v.pcd === true);
    }

    // 7. Origem (multi-select OR — SEM permissividade, sempre preenchida)
    if (filtrosOrigem.length > 0) {
      resultado = resultado.filter((v) =>
        v.origem ? filtrosOrigem.includes(v.origem) : false
      );
    }

    // 8. Ordenação por data — sem data vai pro fim
    resultado.sort((a, b) => {
      const dA = a.data_publicacao ? new Date(a.data_publicacao).getTime() : null;
      const dB = b.data_publicacao ? new Date(b.data_publicacao).getTime() : null;
      if (dA === null && dB === null) return 0;
      if (dA === null) return 1;
      if (dB === null) return -1;
      return ordenacao === "recente" ? dB - dA : dA - dB;
    });

    return resultado;
  }, [
    vagasIniciais,
    busca,
    filtrosModalidade,
    ordenacao,
    filtrosEstado,
    filtrosNivel,
    filtrosContrato,
    filtroPcd,
    filtrosOrigem,
  ]);

  // --- Reset de página ao alterar qualquer filtro ---
  useEffect(() => {
    setPaginaAtual(1);
  }, [
    busca,
    filtrosModalidade,
    ordenacao,
    filtrosEstado,
    filtrosNivel,
    filtrosContrato,
    filtroPcd,
    filtrosOrigem,
  ]);

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

  const removerDeArray = (arr: string[], valor: string): string[] =>
    arr.filter((v) => v !== valor);

  // --- Metadados: cada item de array vira UM chip individual ---
  const filtrosAtivos: FiltroAtivo[] = useMemo(() => {
    const lista: FiltroAtivo[] = [];

    if (busca.trim()) {
      lista.push({ nome: `"${busca.trim()}"`, limpar: () => setBusca("") });
    }

    filtrosModalidade.forEach((mod) => {
      lista.push({
        nome: mod,
        limpar: () => setFiltrosModalidade((arr) => removerDeArray(arr, mod)),
      });
    });

    filtrosNivel.forEach((nivel) => {
      const mapNivel: Record<string, string> = {
        estagio: "Estágio",
        junior: "Júnior",
        pleno: "Pleno",
        senior: "Sênior",
      };
      lista.push({
        nome: mapNivel[nivel] ?? nivel,
        limpar: () => setFiltrosNivel((arr) => removerDeArray(arr, nivel)),
      });
    });

    filtrosEstado.forEach((uf) => {
      lista.push({
        nome: uf,
        limpar: () => setFiltrosEstado((arr) => removerDeArray(arr, uf)),
      });
    });

    filtrosContrato.forEach((tipo) => {
      lista.push({
        nome: tipo,
        limpar: () => setFiltrosContrato((arr) => removerDeArray(arr, tipo)),
      });
    });

    if (filtroPcd) {
      lista.push({ nome: "PCD", limpar: () => setFiltroPcd(false) });
    }

    filtrosOrigem.forEach((origem) => {
      lista.push({
        nome: origem,
        limpar: () => setFiltrosOrigem((arr) => removerDeArray(arr, origem)),
      });
    });

    return lista;
  }, [
    busca,
    filtrosModalidade,
    filtrosNivel,
    filtrosEstado,
    filtrosContrato,
    filtroPcd,
    filtrosOrigem,
  ]);

  const totalFiltrosAtivos = filtrosAtivos.length;

  const limparFiltros = () => {
    setBusca("");
    setFiltrosModalidade([]);
    setFiltrosNivel([]);
    setFiltrosEstado([]);
    setFiltrosContrato([]);
    setFiltroPcd(false);
    setFiltrosOrigem([]);
  };

  return {
    busca, setBusca,
    ordenacao, setOrdenacao,
    filtrosModalidade, setFiltrosModalidade,
    filtrosNivel, setFiltrosNivel,
    filtrosEstado, setFiltrosEstado,
    filtrosContrato, setFiltrosContrato,
    filtrosOrigem, setFiltrosOrigem,
    filtroPcd, setFiltroPcd,
    estadosDisponiveis,
    contratosDisponiveis,
    origensDisponiveis,
    paginaAtual, setPaginaAtual,
    vagasFiltradas, vagasPagina, totalPaginas, paginasVisiveis,
    filtrosAtivos,
    totalFiltrosAtivos,
    limparFiltros,
  };
}
import { useState, useMemo } from 'react';
import type { IVaga } from '../types/IVaga';

// Função utilitária para remover acentos e caracteres especiais
const normalizarTexto = (texto: string) => {
  if (!texto) return "";
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toLowerCase()
    .trim();
};

export function useFiltrosVagas(vagasIniciais: IVaga[]) {
  const [busca, setBusca] = useState("");
  const [filtroModalidade, setFiltroModalidade] = useState<string | null>(null);
  const [ordenacao, setOrdenacao] = useState<"recente" | "antiga">("recente");
  const [filtroLocalidade, setFiltroLocalidade] = useState<string>("todas");
  const [filtroNivel, setFiltroNivel] = useState<string>("todos"); // Novo filtro de Nível
  const [paginaAtual, setPaginaAtual] = useState(1);
  
  const VAGAS_POR_PAGINA = 9;

  const vagasFiltradas = useMemo(() => {
    let resultado = [...vagasIniciais];

    // 1. Busca Inteligente (Ignora Case e Acentos)
    if (busca.trim()) {
      const termosBusca = normalizarTexto(busca).split(/\s+/);
      
      resultado = resultado.filter(vaga => {
        const textoVaga = normalizarTexto(`${vaga.titulo} ${vaga.empresa}`);
        return termosBusca.every(termo => textoVaga.includes(termo));
      });
    }

    // 2. Filtro de Modalidade
    if (filtroModalidade) {
      resultado = resultado.filter((v) =>
        normalizarTexto(v.modalidade).includes(normalizarTexto(filtroModalidade))
      );
    }

    // 3. Filtro de Nível (Mock avançado baseado no título)
    if (filtroNivel !== "todos") {
      resultado = resultado.filter((v) => {
        const tituloNormalizado = normalizarTexto(v.titulo);
        if (filtroNivel === "estagio") {
          return tituloNormalizado.includes("estagio") || tituloNormalizado.includes("intern");
        }
        if (filtroNivel === "junior") {
          return tituloNormalizado.includes("junior") || tituloNormalizado.includes("jr");
        }
        if (filtroNivel === "pleno") {
          return tituloNormalizado.includes("pleno") || tituloNormalizado.includes("mid");
        }
        if (filtroNivel === "senior") {
          return tituloNormalizado.includes("senior") || tituloNormalizado.includes("sr");
        }
        return true;
      });
    }

    // 4. Filtro de Localidade (Mock)
    if (filtroLocalidade !== "todas") {
        if (filtroLocalidade === "internacional") {
            resultado = resultado.filter(v => 
                normalizarTexto(v.titulo).includes("remote") || 
                normalizarTexto(v.titulo).includes("us ") ||
                normalizarTexto(v.titulo).includes("europe")
            );
        }
    }

    // 5. Ordenação
    resultado.sort((a, b) => {
      const dA = new Date(a.data_publicacao || 0).getTime();
      const dB = new Date(b.data_publicacao || 0).getTime();
      return ordenacao === "recente" ? dB - dA : dA - dB;
    });

    return resultado;
  }, [vagasIniciais, busca, filtroModalidade, ordenacao, filtroLocalidade, filtroNivel]);

  // Paginação Matemática
  const totalPaginas = Math.max(1, Math.ceil(vagasFiltradas.length / VAGAS_POR_PAGINA));
  
  const vagasPagina = useMemo(() => {
    const inicio = (paginaAtual - 1) * VAGAS_POR_PAGINA;
    const fim = inicio + VAGAS_POR_PAGINA;
    return vagasFiltradas.slice(inicio, fim);
  }, [vagasFiltradas, paginaAtual]);

  // Reset de página ao alterar qualquer filtro
  useMemo(() => {
    setPaginaAtual(1);
  }, [busca, filtroModalidade, ordenacao, filtroLocalidade, filtroNivel]);

  const paginasVisiveis = () => {
    const pages: number[] = [];
    for (let i = Math.max(1, paginaAtual - 2); i <= Math.min(totalPaginas, paginaAtual + 2); i++) {
      pages.push(i);
    }
    return pages;
  };

  return {
    busca, setBusca,
    filtroModalidade, setFiltroModalidade,
    ordenacao, setOrdenacao,
    filtroLocalidade, setFiltroLocalidade,
    filtroNivel, setFiltroNivel,
    paginaAtual, setPaginaAtual,
    vagasFiltradas, vagasPagina, totalPaginas, paginasVisiveis
  };
}
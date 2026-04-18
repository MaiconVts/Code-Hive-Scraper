import { useState, useEffect } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MapPin,
  GraduationCap,
} from "lucide-react";
import { getVagas } from "../services/api";
import type { IVaga } from "../types/IVaga";
import { ROUTES } from "../constants/routes";
import VagaDetalhe from "../components/VagaDetalhe";
import PageTransition from "../components/PageTransition";
import { useFiltrosVagas } from "../hooks/useFiltrosVagas"; // Ajuste o caminho se necessário

const modalidadeCor: Record<string, string> = {
  Remoto: "#4FC3F7",
  "Home Office": "#4FC3F7",
  Híbrido: "#FFB703",
  Presencial: "#A0AEC0",
  Teletrabalho: "#4FC3F7",
};

function formatarData(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

export default function VagasDev() {
  const [vagasRaw, setVagasRaw] = useState<IVaga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [vagaSelecionada, setVagaSelecionada] = useState<IVaga | null>(null);

  // Instanciando nosso Custom Hook de filtros (Crie este arquivo separado)
  const {
    busca,
    setBusca,
    filtroModalidade,
    setFiltroModalidade,
    ordenacao,
    setOrdenacao,
    filtroLocalidade,
    setFiltroLocalidade,
    filtroNivel,
    setFiltroNivel,
    paginaAtual,
    setPaginaAtual,
    vagasFiltradas,
    vagasPagina,
    totalPaginas,
    paginasVisiveis,
  } = useFiltrosVagas(vagasRaw);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      const data = await getVagas(ROUTES.VAGAS_DEV);
      setVagasRaw(data);
      setCarregando(false);
    })();
  }, []);

  return (
    <PageTransition>
      {/* Contêiner Pai Absoluto: Força 100% da largura, centraliza tudo e dá o espaço do Header (pt-[140px]) */}
      <div
        className="min-h-screen w-full flex flex-col items-center pt-[140px] pb-16 px-6 lg:px-8"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {/* Contêiner de Conteúdo: Limita a largura para não esticar em monitores gigantes e usa flex-col com gap para espaçamento vertical */}
        <div className="w-[92%] max-w-[1200px] flex flex-col gap-10">
          {/* Cabeçalho da página */}
          <div className="text-center w-full">
            <p className="text-[11px] text-[#4FC3F7] tracking-[0.3em] uppercase mb-2">
              Tecnologia & Desenvolvimento
            </p>
            <h1 className="text-[32px] font-bold text-white flex items-center justify-center gap-3">
              Vagas Dev
            </h1>
          </div>

          {/* ================= INÍCIO DA ÁREA ALTERADA (FILTROS) ================= */}
          {/* Barra de Busca e Filtros Avançados */}
          <div
            className="flex flex-col xl:flex-row items-center justify-between gap-4 px-6 py-5 w-full"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "14px",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Input de Busca */}
            <div className="relative w-full xl:w-[35%] flex items-center">
              <Search
                className="absolute left-4"
                size={16}
                color="#4FC3F7"
                style={{ pointerEvents: "none" }}
              />
              <input
                type="text"
                placeholder="Ex: C# .NET Pleno"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full h-[44px] text-[14px] text-white placeholder-[#A0AEC0] outline-none transition-all"
                style={{
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: "10px",
                  paddingLeft: "42px",
                  paddingRight: "16px",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.border =
                    "1px solid rgba(79,195,247,0.5)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.border =
                    "1px solid rgba(255,255,255,0.09)")
                }
              />
            </div>

            {/* Grupo de Filtros Selects - Ajustado para quebrar linha no mobile sem sumir */}
            <div className="flex flex-wrap items-center justify-start xl:justify-end gap-3 w-full xl:w-auto">
              
              {/* Filtro de Nível Hierárquico - Removido 'hidden md:flex', adicionado 'w-full sm:w-auto flex-1' */}
              <div className="relative flex items-center w-full sm:w-auto flex-1 sm:flex-none">
                <GraduationCap
                  className="absolute left-3"
                  size={15}
                  color="#A0AEC0"
                  style={{ pointerEvents: "none" }}
                />
                <select
                  value={filtroNivel}
                  onChange={(e) => setFiltroNivel(e.target.value)}
                  className="w-full h-[44px] text-[13px] text-white outline-none cursor-pointer appearance-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: "10px",
                    paddingLeft: "36px",
                    paddingRight: "16px",
                  }}
                >
                  <option value="todos" style={{ color: "#050015" }}>
                    Qualquer Nível
                  </option>
                  <option value="estagio" style={{ color: "#050015" }}>
                    Estágio
                  </option>
                  <option value="junior" style={{ color: "#050015" }}>
                    Júnior
                  </option>
                  <option value="pleno" style={{ color: "#050015" }}>
                    Pleno
                  </option>
                  <option value="senior" style={{ color: "#050015" }}>
                    Sênior
                  </option>
                </select>
              </div>

              {/* Filtro de Localidade - Removido 'hidden md:flex', adicionado 'w-full sm:w-auto flex-1' */}
              <div className="relative flex items-center w-full sm:w-auto flex-1 sm:flex-none">
                <MapPin
                  className="absolute left-3"
                  size={14}
                  color="#A0AEC0"
                  style={{ pointerEvents: "none" }}
                />
                <select
                  value={filtroLocalidade}
                  onChange={(e) => setFiltroLocalidade(e.target.value)}
                  className="w-full h-[44px] text-[13px] text-white outline-none cursor-pointer appearance-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: "10px",
                    paddingLeft: "34px",
                    paddingRight: "16px",
                  }}
                >
                  <option value="todas" style={{ color: "#050015" }}>
                    Qualquer Local
                  </option>
                  <option value="nacional" style={{ color: "#050015" }}>
                    Nacional
                  </option>
                  <option value="internacional" style={{ color: "#050015" }}>
                    Internacional
                  </option>
                </select>
              </div>

              {/* Botões de Modalidade Rápida - flex-1 para esticar no mobile */}
              <div
                className="flex items-center gap-1 sm:gap-2 p-1.5 rounded-[12px] w-full sm:w-auto justify-between sm:justify-center"
                style={{
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {["Remoto", "Híbrido", "Presencial"].map((f) => {
                  const isActive = filtroModalidade === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setFiltroModalidade(isActive ? null : f)}
                      className="flex-1 sm:flex-none px-2 sm:px-5 py-2 rounded-lg text-[12px] sm:text-[13px] whitespace-nowrap transition-all duration-200"
                      style={{
                        background: isActive ? "#FFB703" : "transparent",
                        color: isActive ? "#050015" : "#A0AEC0",
                        fontWeight: isActive ? 600 : 500,
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>

              {/* Ordenação Estilizada - w-full no mobile */}
              <select
                value={ordenacao}
                onChange={(e) =>
                  setOrdenacao(e.target.value as "recente" | "antiga")
                }
                className="w-full sm:w-auto h-[44px] px-4 text-[13px] text-white outline-none cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: "10px",
                }}
              >
                <option value="recente" style={{ color: "#050015" }}>
                  Mais recentes
                </option>
                <option value="antiga" style={{ color: "#050015" }}>
                  Mais antigas
                </option>
              </select>
            </div>
          </div>
          {/* ================= FIM DA ÁREA ALTERADA ================= */}

          {/* Loading */}
          {carregando && (
            <div className="flex items-center justify-center py-20 w-full">
              <div className="w-8 h-8 border-2 border-[#4FC3F7] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* Vazio */}
          {!carregando && vagasFiltradas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 w-full">
              <p className="text-white text-[17px] font-semibold">
                Nenhuma vaga atende aos filtros
              </p>
              <p className="text-[#A0AEC0] text-[13px]">
                Tente remover algumas palavras-chave ou alterar a modalidade.
              </p>
            </div>
          )}

          {/* Grid de Vagas (Ajustado para 3x3 = 9 itens perfeitos no desktop) */}
          {!carregando && vagasPagina.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {vagasPagina.map((vaga) => {
                const cor = modalidadeCor[vaga.modalidade] ?? "#A0AEC0";
                return (
                  <div
                    key={vaga.id}
                    onClick={() => setVagaSelecionada(vaga)}
                    className="group cursor-pointer transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "16px",
                      backdropFilter: "blur(10px)",
                      padding: "24px", // Padding aumentado para dar respiro
                      minHeight: "160px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.border =
                        "1px solid rgba(255,255,255,0.15)";
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)";
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow =
                        "0 10px 30px -10px rgba(0,0,0,0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.border =
                        "1px solid rgba(255,255,255,0.06)";
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.03)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Linha 1: título + badge */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <h3 className="text-[16px] font-semibold text-white leading-snug flex-1 group-hover:text-[#4FC3F7] transition-colors">
                        {vaga.titulo}
                      </h3>
                      <span
                        className="text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0"
                        style={{
                          background: `${cor}15`,
                          color: cor,
                          border: `1px solid ${cor}30`,
                        }}
                      >
                        {vaga.modalidade}
                      </span>
                    </div>

                    {/* Linha 2: empresa */}
                    <p className="text-[14px] text-[#A0AEC0] mb-5 flex-1 font-medium">
                      {vaga.empresa}
                      <span className="text-[#4a4a6a] mx-2">·</span>
                      <span className="text-[#4a4a6a] text-[12px]">
                        {vaga.origem}
                      </span>
                    </p>

                    {/* Linha 3: data + link */}
                    <div className="flex items-center justify-between pt-3 border-t border-[rgba(255,255,255,0.05)]">
                      <span className="text-[12px] text-[#6b7280]">
                        {formatarData(vaga.data_publicacao)}
                      </span>
                      <span className="text-[12px] text-[#4FC3F7] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Ver detalhes →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginação Matemática Perfeita */}
          {!carregando && totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  color: paginaAtual === 1 ? "#4a4a6a" : "#A0AEC0",
                }}
              >
                <ChevronLeft size={18} />
              </button>
              {paginasVisiveis().map((p) => (
                <button
                  key={p}
                  onClick={() => setPaginaAtual(p)}
                  className="w-10 h-10 flex items-center justify-center text-[14px] rounded-xl transition-all"
                  style={{
                    background:
                      paginaAtual === p ? "#FFB703" : "rgba(255,255,255,0.03)",
                    border:
                      paginaAtual === p
                        ? "1px solid #FFB703"
                        : "1px solid rgba(255,255,255,0.05)",
                    color: paginaAtual === p ? "#050015" : "#A0AEC0",
                    fontWeight: paginaAtual === p ? 700 : 500,
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() =>
                  setPaginaAtual((p) => Math.min(totalPaginas, p + 1))
                }
                disabled={paginaAtual === totalPaginas}
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  color: paginaAtual === totalPaginas ? "#4a4a6a" : "#A0AEC0",
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* NOVO: Rodapé Inteligente - Contador de Vagas (Mantido estritamente dentro da estrutura) */}
          {!carregando && (
            <div className="w-full mt-auto pt-8 flex flex-col sm:flex-row items-center justify-between border-t border-[rgba(255,255,255,0.05)] gap-4 text-center sm:text-left">
              <p className="text-[13px] text-[#A0AEC0]">Atualizado via Gupy</p>
              <div
                className="px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-2"
                style={{
                  background: "rgba(79,195,247,0.1)",
                  border: "1px solid rgba(79,195,247,0.2)",
                  color: "#4FC3F7",
                }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4FC3F7] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4FC3F7]"></span>
                </span>
                {vagasFiltradas.length}{" "}
                {vagasFiltradas.length === 1
                  ? "vaga encontrada"
                  : "vagas encontradas"}
              </div>
            </div>
          )}
        </div>

        {vagaSelecionada && (
          <VagaDetalhe
            vaga={vagaSelecionada}
            onClose={() => setVagaSelecionada(null)}
          />
        )}
      </div>
    </PageTransition>
  );
}
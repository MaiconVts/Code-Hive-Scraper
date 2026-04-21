import { useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MapPin,
  GraduationCap,
  Briefcase,
  Accessibility,
  X,
  SlidersHorizontal,
  Layers,
  RefreshCw,
} from "lucide-react";
import type { IVaga } from "../types/IVaga";
import { ROUTES } from "../constants/routes";
import VagaDetalhe from "../components/VagaDetalhe";
import PageTransition from "../components/PageTransition";
import { useFiltrosVagas } from "../hooks/useFiltrosVagas";
import { useCacheVagas } from "../hooks/useCacheVagas";

const modalidadeCor: Record<string, string> = {
  Remoto: "#4FC3F7",
  Híbrido: "#FFB703",
  Presencial: "#A0AEC0",
};

const contratoCor: Record<string, string> = {
  CLT: "#4FC3F7",
  PJ: "#FFB703",
  Estágio: "#A78BFA",
  "Jovem Aprendiz": "#34D399",
  Temporário: "#F87171",
  Freelancer: "#FB923C",
  Autônomo: "#FB923C",
  "Banco de Talentos": "#94A3B8",
};

const origemCor: Record<string, string> = {
  Gupy: "#4FC3F7",
  LinkedIn: "#0077B5",
};

const PLATAFORMAS_CANONICAS = ["Gupy", "LinkedIn"] as const;

const ROTAS_ADV = [
  ROUTES.FIREBASE_VAGAS_ADV_GUPY,
  ROUTES.FIREBASE_VAGAS_ADV_LINKEDIN,
];

function formatarData(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function corPrazo(prazoIso: string): { cor: string; texto: string } {
  const hoje = new Date();
  const prazo = new Date(prazoIso);
  const dias = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (dias < 0) return { cor: "#F87171", texto: "expirada" };
  if (dias <= 7) return { cor: "#FFB703", texto: `até ${formatarData(prazoIso)}` };
  return { cor: "#34D399", texto: `até ${formatarData(prazoIso)}` };
}

function formatarTempoRelativo(timestamp: number | null): string {
  if (!timestamp) return "";
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `há ${diffD}d`;
}

const selectBase: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "10px",
};

export default function VagasAdv() {
  const [vagaSelecionada, setVagaSelecionada] = useState<IVaga | null>(null);

  const { vagas: vagasRaw, carregando, atualizando, atualizadoEm, recarregar } = useCacheVagas(ROTAS_ADV);

  const {
    busca, setBusca,
    filtroModalidade, setFiltroModalidade,
    ordenacao, setOrdenacao,
    filtroEstado, setFiltroEstado,
    filtroNivel, setFiltroNivel,
    filtroContrato, setFiltroContrato,
    filtroPcd, setFiltroPcd,
    filtroOrigem, setFiltroOrigem,
    estadosDisponiveis,
    contratosDisponiveis,
    origensDisponiveis,
    paginaAtual, setPaginaAtual,
    vagasFiltradas, vagasPagina, totalPaginas, paginasVisiveis,
    filtrosAtivos, totalFiltrosAtivos, limparFiltros,
  } = useFiltrosVagas(vagasRaw);

  return (
    <PageTransition>
      <style>{`
        .filtros-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          width: 100%;
        }
        @media (max-width: 900px) {
          .filtros-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 480px) {
          .filtros-grid { grid-template-columns: minmax(0, 1fr); }
        }

        .linha-busca {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          min-width: 0;
        }
        @media (max-width: 900px) {
          .linha-busca {
            flex-direction: column;
            align-items: stretch;
          }
        }

        .toggles-modalidade {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .icon-spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>

      <div
        className="min-h-screen w-full flex flex-col items-center pb-16 px-4 sm:px-6 lg:px-8"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          marginTop: '64px',
          overflowX: "hidden",
        }}
      >
        <div className="w-full max-w-[1200px] flex flex-col gap-10">
          <div className="h-0.1" />

          {/* Hero */}
          <div className="text-center w-full py-6">
            <p className="text-[11px] text-[#FFB703] tracking-[0.3em] uppercase mb-3">
              Direito & Advocacia
            </p>
            <h1
              className="text-[42px] sm:text-[52px] font-bold text-white mb-3"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                textShadow: "0 0 30px rgba(255,183,3,0.4), 0 0 60px rgba(255,183,3,0.15)",
              }}
            >
              Vagas Jurídico
            </h1>
            <p className="text-[14px] text-[#A0AEC0]">
              {carregando ? "Carregando vagas..." : `${vagasFiltradas.length} vagas disponíveis agora`}
            </p>
          </div>

          {/* Barra de Filtros */}
          <div
            className="flex flex-col w-full"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "14px",
              backdropFilter: "blur(12px)",
              padding: "20px",
              gap: "16px",
              minWidth: 0,
            }}
          >
            {/* Cabeçalho: título + contador + atualizar + limpar */}
            <div className="flex items-center justify-between gap-3 flex-wrap w-full">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <SlidersHorizontal size={16} color="#A0AEC0" />
                <span className="text-[13px] text-[#A0AEC0] font-medium uppercase tracking-wider">
                  Filtros
                </span>
                {totalFiltrosAtivos > 0 && (
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(255,183,3,0.15)",
                      color: "#FFB703",
                      border: "1px solid rgba(255,183,3,0.3)",
                    }}
                  >
                    {totalFiltrosAtivos} {totalFiltrosAtivos === 1 ? "ativo" : "ativos"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {!carregando && (
                  <div className="flex items-center gap-2">
                    {atualizadoEm && (
                      <span className="text-[11px] text-[#6b7280]">
                        Atualizado {formatarTempoRelativo(atualizadoEm)}
                      </span>
                    )}
                    <button
                      onClick={recarregar}
                      disabled={atualizando}
                      className="flex items-center gap-1.5 text-[12px] text-[#A0AEC0] hover:text-white transition-colors disabled:opacity-50"
                      style={{ fontWeight: 500, cursor: atualizando ? "wait" : "pointer" }}
                      title="Buscar vagas atualizadas no Firebase"
                    >
                      <RefreshCw size={14} className={atualizando ? "icon-spinning" : ""} />
                      Atualizar
                    </button>
                  </div>
                )}

                {totalFiltrosAtivos > 0 && (
                  <button
                    onClick={limparFiltros}
                    className="flex items-center gap-1.5 text-[12px] text-[#A0AEC0] hover:text-white transition-colors shrink-0"
                    style={{ fontWeight: 500 }}
                  >
                    <X size={14} />
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Linha: Busca + Modalidade + Ordenação */}
            <div className="linha-busca">
              <div className="relative flex items-center flex-1" style={{ minWidth: 0 }}>
                <Search className="absolute left-4" size={16} color="#FFB703" style={{ pointerEvents: "none" }} />
                <input
                  type="text"
                  placeholder="Ex: Advogado Trabalhista Sênior"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full h-[44px] text-[14px] text-white placeholder-[#A0AEC0] outline-none transition-all"
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: "10px",
                    paddingLeft: "42px",
                    paddingRight: "16px",
                    minWidth: 0,
                  }}
                  onFocus={(e) => (e.currentTarget.style.border = "1px solid rgba(255,183,3,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.09)")}
                />
              </div>

              <div
                className="toggles-modalidade p-1.5 rounded-[12px] shrink-0"
                style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                {["Remoto", "Híbrido", "Presencial"].map((f) => {
                  const isActive = filtroModalidade === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setFiltroModalidade(isActive ? null : f)}
                      className="px-3 py-2 rounded-lg text-[13px] whitespace-nowrap transition-all duration-200"
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

              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value as "recente" | "antiga")}
                className="h-[44px] px-4 text-[13px] text-white outline-none cursor-pointer shrink-0"
                style={{ ...selectBase }}
              >
                <option value="recente" style={{ color: "#050015" }}>Mais recentes</option>
                <option value="antiga" style={{ color: "#050015" }}>Mais antigas</option>
              </select>
            </div>

            {/* Linha destacada: Plataforma — sempre visível */}
            <div
              className="flex flex-col gap-2 w-full"
              style={{
                background: "rgba(255,183,3,0.04)",
                border: "1px solid rgba(255,183,3,0.12)",
                borderRadius: "12px",
                padding: "12px 14px",
              }}
            >
              <div className="flex items-center gap-2">
                <Layers size={13} color="#FFB703" />
                <span className="text-[11px] text-[#FFB703] font-semibold uppercase tracking-wider">
                  Plataforma
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setFiltroOrigem("todas")}
                  className="px-3 py-1.5 rounded-lg text-[12px] whitespace-nowrap transition-all duration-200"
                  style={{
                    background: filtroOrigem === "todas" ? "#FFB703" : "rgba(0,0,0,0.2)",
                    color: filtroOrigem === "todas" ? "#050015" : "#A0AEC0",
                    fontWeight: filtroOrigem === "todas" ? 600 : 500,
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  Todas
                </button>

                {PLATAFORMAS_CANONICAS.map((origem) => {
                  const disponivel = origensDisponiveis.includes(origem);
                  const isActive = filtroOrigem === origem;
                  const cor = origemCor[origem] ?? "#94A3B8";

                  return (
                    <button
                      key={origem}
                      onClick={() => disponivel && setFiltroOrigem(origem)}
                      disabled={!disponivel}
                      title={
                        disponivel
                          ? `Mostrar apenas vagas do ${origem}`
                          : `Ainda não há vagas do ${origem} nesta categoria`
                      }
                      className="px-3 py-1.5 rounded-lg text-[12px] whitespace-nowrap transition-all duration-200"
                      style={{
                        background: isActive ? cor : "rgba(0,0,0,0.2)",
                        color: isActive ? "#050015" : disponivel ? "#A0AEC0" : "#4a4a6a",
                        fontWeight: isActive ? 600 : 500,
                        border: `1px solid ${disponivel ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)"}`,
                        cursor: disponivel ? "pointer" : "not-allowed",
                        opacity: disponivel ? 1 : 0.45,
                      }}
                    >
                      {origem}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid: Nível + Estado + Contrato + PCD */}
            <div className="filtros-grid">
              <div className="relative flex items-center" style={{ minWidth: 0 }}>
                <GraduationCap className="absolute left-3 pointer-events-none" size={15} color="#A0AEC0" />
                <select
                  value={filtroNivel}
                  onChange={(e) => setFiltroNivel(e.target.value)}
                  className="w-full h-[44px] text-[13px] text-white outline-none cursor-pointer appearance-none"
                  style={{ ...selectBase, paddingLeft: "36px", paddingRight: "16px", minWidth: 0 }}
                >
                  <option value="todos" style={{ color: "#050015" }}>Qualquer Nível</option>
                  <option value="estagio" style={{ color: "#050015" }}>Estágio</option>
                  <option value="junior" style={{ color: "#050015" }}>Júnior</option>
                  <option value="pleno" style={{ color: "#050015" }}>Pleno</option>
                  <option value="senior" style={{ color: "#050015" }}>Sênior</option>
                </select>
              </div>

              <div className="relative flex items-center" style={{ minWidth: 0 }}>
                <MapPin className="absolute left-3 pointer-events-none" size={14} color="#A0AEC0" />
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="w-full h-[44px] text-[13px] text-white outline-none cursor-pointer appearance-none"
                  style={{ ...selectBase, paddingLeft: "34px", paddingRight: "16px", minWidth: 0 }}
                >
                  <option value="todos" style={{ color: "#050015" }}>Qualquer Estado</option>
                  {estadosDisponiveis.map((uf) => (
                    <option key={uf} value={uf} style={{ color: "#050015" }}>{uf}</option>
                  ))}
                </select>
              </div>

              <div className="relative flex items-center" style={{ minWidth: 0 }}>
                <Briefcase className="absolute left-3 pointer-events-none" size={14} color="#A0AEC0" />
                <select
                  value={filtroContrato}
                  onChange={(e) => setFiltroContrato(e.target.value)}
                  className="w-full h-[44px] text-[13px] text-white outline-none cursor-pointer appearance-none"
                  style={{ ...selectBase, paddingLeft: "34px", paddingRight: "16px", minWidth: 0 }}
                >
                  <option value="todos" style={{ color: "#050015" }}>Qualquer Contrato</option>
                  {contratosDisponiveis.map((tipo) => (
                    <option key={tipo} value={tipo} style={{ color: "#050015" }}>{tipo}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setFiltroPcd(!filtroPcd)}
                className="flex items-center justify-center gap-2 h-[44px] px-4 rounded-[10px] text-[13px] transition-all duration-200 whitespace-nowrap"
                style={{
                  background: filtroPcd ? "rgba(255,183,3,0.15)" : "rgba(255,255,255,0.05)",
                  border: filtroPcd ? "1px solid rgba(255,183,3,0.4)" : "1px solid rgba(255,255,255,0.09)",
                  color: filtroPcd ? "#FFB703" : "#A0AEC0",
                  fontWeight: filtroPcd ? 600 : 400,
                  minWidth: 0,
                }}
              >
                <Accessibility size={14} />
                PCD
              </button>
            </div>

            {/* Chips de filtros ativos */}
            {totalFiltrosAtivos > 0 && (
              <div
                className="flex flex-wrap gap-2 pt-3 w-full"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                {filtrosAtivos.map((filtro, idx) => (
                  <button
                    key={idx}
                    onClick={filtro.limpar}
                    className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full transition-all duration-200"
                    style={{
                      background: "rgba(255,183,3,0.1)",
                      color: "#FFB703",
                      border: "1px solid rgba(255,183,3,0.25)",
                      fontWeight: 500,
                      maxWidth: "100%",
                    }}
                    title="Clique para remover este filtro"
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {filtro.nome}
                    </span>
                    <X size={11} style={{ flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Loading */}
          {carregando && (
            <div className="flex items-center justify-center py-20 w-full">
              <div className="w-8 h-8 border-2 border-[#FFB703] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* Empty state */}
          {!carregando && vagasFiltradas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 w-full px-4 text-center">
              <p className="text-white text-[17px] font-semibold">
                Nenhuma vaga atende aos filtros
              </p>

              {totalFiltrosAtivos > 0 ? (
                <>
                  <p className="text-[#A0AEC0] text-[13px] max-w-md">
                    Você tem {totalFiltrosAtivos} {totalFiltrosAtivos === 1 ? "filtro ativo" : "filtros ativos"}.
                    Tente remover {totalFiltrosAtivos === 1 ? "ele" : "alguns"} para ver mais resultados.
                  </p>

                  <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-lg">
                    {filtrosAtivos.map((filtro, idx) => (
                      <button
                        key={idx}
                        onClick={filtro.limpar}
                        className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg transition-all duration-200"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          color: "#A0AEC0",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        Remover: <strong style={{ color: "#FFFFFF" }}>{filtro.nome}</strong>
                        <X size={12} />
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={limparFiltros}
                    className="mt-4 px-5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200"
                    style={{ background: "#FFB703", color: "#050015" }}
                  >
                    Limpar todos os filtros
                  </button>
                </>
              ) : (
                <p className="text-[#A0AEC0] text-[13px]">
                  As vagas ainda estão sendo coletadas. Tente novamente em alguns minutos.
                </p>
              )}
            </div>
          )}

          {/* Grid de Vagas */}
          {!carregando && vagasPagina.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {vagasPagina.map((vaga) => {
                const corMod = modalidadeCor[vaga.modalidade] ?? "#A0AEC0";
                const corCont = contratoCor[vaga.tipo_contrato || ""] ?? "#94A3B8";
                const corOri = origemCor[vaga.origem] ?? "#94A3B8";
                const temLocal = vaga.city && vaga.city !== "Não informado";
                const prazo = vaga.prazo_inscricao && vaga.prazo_inscricao !== "Não informado"
                  ? corPrazo(vaga.prazo_inscricao) : null;

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
                      padding: "24px",
                      minHeight: "180px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.border = "1px solid rgba(255,255,255,0.15)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 10px 30px -10px rgba(0,0,0,0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-[16px] font-semibold text-white leading-snug flex-1 group-hover:text-[#FFB703] transition-colors">
                        {vaga.titulo}
                      </h3>
                      <span
                        className="text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0"
                        style={{ background: `${corMod}15`, color: corMod, border: `1px solid ${corMod}30` }}
                      >
                        {vaga.modalidade}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="text-[14px] text-[#A0AEC0] font-medium">
                        {vaga.empresa}
                      </p>
                      {vaga.origem && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{
                            background: `${corOri}15`,
                            color: corOri,
                            border: `1px solid ${corOri}30`,
                          }}
                        >
                          {vaga.origem}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {temLocal && (
                        <span className="text-[11px] text-[#A0AEC0] flex items-center gap-1">
                          <MapPin size={11} />
                          {vaga.city}{vaga.state && vaga.state !== "Não informado" ? `, ${vaga.state}` : ""}
                        </span>
                      )}
                      {vaga.tipo_contrato && vaga.tipo_contrato !== "Não informado" && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${corCont}15`, color: corCont, border: `1px solid ${corCont}30` }}
                        >
                          {vaga.tipo_contrato}
                        </span>
                      )}
                      {vaga.pcd && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: "rgba(52,211,153,0.15)", color: "#34D399", border: "1px solid rgba(52,211,153,0.3)" }}
                        >
                          <Accessibility size={10} />
                          PCD
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[rgba(255,255,255,0.05)]">
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-[#6b7280]">{formatarData(vaga.data_publicacao)}</span>
                        {prazo && (
                          <span className="text-[11px]" style={{ color: prazo.cor }}>{prazo.texto}</span>
                        )}
                      </div>
                      <span className="text-[12px] text-[#FFB703] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Ver detalhes →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginação */}
          {!carregando && totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              <button
                onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", color: paginaAtual === 1 ? "#4a4a6a" : "#A0AEC0" }}
              >
                <ChevronLeft size={18} />
              </button>
              {paginasVisiveis().map((p) => (
                <button
                  key={p}
                  onClick={() => setPaginaAtual(p)}
                  className="w-10 h-10 flex items-center justify-center text-[14px] rounded-xl transition-all"
                  style={{
                    background: paginaAtual === p ? "#FFB703" : "rgba(255,255,255,0.03)",
                    border: paginaAtual === p ? "1px solid #FFB703" : "1px solid rgba(255,255,255,0.05)",
                    color: paginaAtual === p ? "#050015" : "#A0AEC0",
                    fontWeight: paginaAtual === p ? 700 : 500,
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual === totalPaginas}
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", color: paginaAtual === totalPaginas ? "#4a4a6a" : "#A0AEC0" }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Rodapé */}
          {!carregando && (
            <div className="w-full mt-auto pt-8 flex flex-col sm:flex-row items-center justify-between border-t border-[rgba(255,255,255,0.05)] gap-4 text-center sm:text-left">
              <p className="text-[13px] text-[#A0AEC0]">Atualizado via Gupy + LinkedIn</p>
              <div
                className="px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-2"
                style={{ background: "rgba(255,183,3,0.1)", border: "1px solid rgba(255,183,3,0.2)", color: "#FFB703" }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFB703] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFB703]"></span>
                </span>
                {vagasFiltradas.length} {vagasFiltradas.length === 1 ? "vaga encontrada" : "vagas encontradas"}
              </div>
            </div>
          )}
        </div>

        {vagaSelecionada && (
          <VagaDetalhe vaga={vagaSelecionada} onClose={() => setVagaSelecionada(null)} />
        )}
      </div>
    </PageTransition>
  );
}
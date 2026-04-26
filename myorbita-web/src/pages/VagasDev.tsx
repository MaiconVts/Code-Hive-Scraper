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
  AlertCircle,
} from "lucide-react";
import type { IVaga } from "../types/IVaga";
import { ROUTES } from "../constants/routes";
import VagaDetalhe from "../components/VagaDetalhe";
import PageTransition from "../components/PageTransition";
import FiltroMultiSelect, { type OpcaoMultiSelect } from "../components/FiltroMultiSelect";
import { useFiltrosVagas } from "../hooks/useFiltrosVagas";
import { useCacheVagas } from "../hooks/useCacheVagas";

// =====================================================================
// Helper local — duplicado intencionalmente do hook para desacoplar.
// Se um dia o conjunto de "valores ausentes" mudar, atualiza nos 3 lugares
// (hook + VagasDev + VagasAdv). É 1 linha em cada — preferível ao acoplamento
// via export/import que pode quebrar build em refactor.
// =====================================================================
const VALORES_AUSENTES = new Set(["", "Não informado", "Brasil"]);

const estaAusente = (valor?: string): boolean => {
  if (!valor) return true;
  return VALORES_AUSENTES.has(valor.trim());
};

// =====================================================================
// Cores (mantidas como no original)
// =====================================================================
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

// Cor neutra usada em todos os indicadores de "campo ausente".
const COR_AUSENTE = "#6b7280";

// =====================================================================
// Opções estáticas dos dropdowns
// =====================================================================
const OPCOES_NIVEL: OpcaoMultiSelect[] = [
  { value: "estagio", label: "Estágio" },
  { value: "junior", label: "Júnior" },
  { value: "pleno", label: "Pleno" },
  { value: "senior", label: "Sênior" },
];

const OPCOES_MODALIDADE: OpcaoMultiSelect[] = [
  { value: "Remoto", label: "Remoto", cor: modalidadeCor.Remoto },
  { value: "Híbrido", label: "Híbrido", cor: modalidadeCor.Híbrido },
  { value: "Presencial", label: "Presencial", cor: modalidadeCor.Presencial },
];

const ROTAS_DEV = [
  ROUTES.FIREBASE_VAGAS_DEV_GUPY,
  ROUTES.FIREBASE_VAGAS_DEV_LINKEDIN,
];

// =====================================================================
// Helpers de formatação
// =====================================================================
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

/**
 * Formata texto de localização considerando campos potencialmente ausentes.
 * Sempre retorna { texto, ausente } — caller decide renderização.
 */
function formatarLocalizacao(city?: string, state?: string): { texto: string; ausente: boolean } {
  const cityValido = !estaAusente(city);
  const stateValido = !estaAusente(state);

  if (!cityValido && !stateValido) {
    return { texto: "Local não informado", ausente: true };
  }
  if (cityValido && stateValido) {
    return { texto: `${city}, ${state}`, ausente: false };
  }
  if (cityValido) {
    return { texto: city!, ausente: false };
  }
  return { texto: state!, ausente: false };
}

const selectBase: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "10px",
};

// =====================================================================
// Componente principal
// =====================================================================
export default function VagasDev() {
  const [vagaSelecionada, setVagaSelecionada] = useState<IVaga | null>(null);

  const { vagas: vagasRaw, carregando, atualizando, atualizadoEm, recarregar } = useCacheVagas(ROTAS_DEV);

  const {
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
    filtrosAtivos, totalFiltrosAtivos, limparFiltros,
  } = useFiltrosVagas(vagasRaw);

  const opcoesEstado: OpcaoMultiSelect[] = estadosDisponiveis.map((uf) => ({
    value: uf,
    label: uf,
  }));

  const opcoesContrato: OpcaoMultiSelect[] = contratosDisponiveis.map((tipo) => ({
    value: tipo,
    label: tipo,
  }));

  const toggleOrigem = (origem: string) => {
    if (filtrosOrigem.includes(origem)) {
      setFiltrosOrigem(filtrosOrigem.filter((o) => o !== origem));
    } else {
      setFiltrosOrigem([...filtrosOrigem, origem]);
    }
  };

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
          marginTop: "64px",
          overflowX: "hidden",
        }}
      >
        <div className="w-full max-w-[1200px] flex flex-col gap-10">
          <div className="h-0.1" />

          {/* Hero */}
          <div className="text-center w-full py-6">
            <p className="text-[11px] text-[#4FC3F7] tracking-[0.3em] uppercase mb-3 mt-6">
              Tecnologia & Desenvolvimento
            </p>
            <h1
              className="text-[42px] sm:text-[52px] font-bold text-white mb-3"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                textShadow: "0 0 30px rgba(79,195,247,0.4), 0 0 60px rgba(79,195,247,0.15)",
              }}
            >
              Vagas Dev
            </h1>
            <p className="text-[14px] text-[#A0AEC0]">
              {carregando
                ? "Carregando vagas..."
                : `${vagasFiltradas.length} vagas disponíveis agora`}
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
                      background: "rgba(79,195,247,0.15)",
                      color: "#4FC3F7",
                      border: "1px solid rgba(79,195,247,0.3)",
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

            <div className="linha-busca">
              <div className="relative flex items-center flex-1" style={{ minWidth: 0 }}>
                <Search className="absolute left-4" size={16} color="#4FC3F7" style={{ pointerEvents: "none" }} />
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
                    minWidth: 0,
                  }}
                  onFocus={(e) => (e.currentTarget.style.border = "1px solid rgba(79,195,247,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.09)")}
                />
              </div>

              <div style={{ width: "200px", flexShrink: 0 }}>
                <FiltroMultiSelect
                  placeholder="Modalidade"
                  opcoes={OPCOES_MODALIDADE}
                  selecionados={filtrosModalidade}
                  onChange={setFiltrosModalidade}
                />
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

            {/* Plataforma */}
            <div
              className="flex flex-col gap-2 w-full"
              style={{
                background: "rgba(79,195,247,0.04)",
                border: "1px solid rgba(79,195,247,0.12)",
                borderRadius: "12px",
                padding: "12px 14px",
              }}
            >
              <div className="flex items-center gap-2">
                <Layers size={13} color="#4FC3F7" />
                <span className="text-[11px] text-[#4FC3F7] font-semibold uppercase tracking-wider">
                  Plataforma
                </span>
                {filtrosOrigem.length > 0 && (
                  <span className="text-[10px] text-[#4FC3F7] opacity-70">
                    ({filtrosOrigem.length} {filtrosOrigem.length === 1 ? "selecionada" : "selecionadas"})
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {origensDisponiveis.map((origem) => {
                  const isActive = filtrosOrigem.includes(origem);
                  const cor = origemCor[origem] ?? "#94A3B8";

                  return (
                    <button
                      key={origem}
                      onClick={() => toggleOrigem(origem)}
                      title={
                        isActive
                          ? `Remover filtro do ${origem}`
                          : `Adicionar vagas do ${origem}`
                      }
                      className="px-3 py-1.5 rounded-lg text-[12px] whitespace-nowrap transition-all duration-200"
                      style={{
                        background: isActive ? cor : "rgba(0,0,0,0.2)",
                        color: isActive ? "#050015" : "#A0AEC0",
                        fontWeight: isActive ? 600 : 500,
                        border: "1px solid rgba(255,255,255,0.05)",
                        cursor: "pointer",
                      }}
                    >
                      {origem}
                    </button>
                  );
                })}

                {filtrosOrigem.length === 0 && (
                  <span className="text-[11px] text-[#6b7280] italic ml-1">
                    Nenhum filtro = todas as plataformas
                  </span>
                )}
              </div>
            </div>

            <div className="filtros-grid">
              <FiltroMultiSelect
                icone={<GraduationCap size={15} />}
                placeholder="Qualquer Nível"
                opcoes={OPCOES_NIVEL}
                selecionados={filtrosNivel}
                onChange={setFiltrosNivel}
              />

              <FiltroMultiSelect
                icone={<MapPin size={14} />}
                placeholder="Qualquer Estado"
                opcoes={opcoesEstado}
                selecionados={filtrosEstado}
                onChange={setFiltrosEstado}
              />

              <FiltroMultiSelect
                icone={<Briefcase size={14} />}
                placeholder="Qualquer Contrato"
                opcoes={opcoesContrato}
                selecionados={filtrosContrato}
                onChange={setFiltrosContrato}
              />

              <button
                onClick={() => setFiltroPcd(!filtroPcd)}
                className="flex items-center justify-center gap-2 h-[44px] px-4 rounded-[10px] text-[13px] transition-all duration-200 whitespace-nowrap"
                style={{
                  background: filtroPcd ? "rgba(79,195,247,0.15)" : "rgba(255,255,255,0.05)",
                  border: filtroPcd ? "1px solid rgba(79,195,247,0.4)" : "1px solid rgba(255,255,255,0.09)",
                  color: filtroPcd ? "#4FC3F7" : "#A0AEC0",
                  fontWeight: filtroPcd ? 600 : 400,
                  minWidth: 0,
                }}
              >
                <Accessibility size={14} />
                PCD
              </button>
            </div>

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
                      background: "rgba(79,195,247,0.1)",
                      color: "#4FC3F7",
                      border: "1px solid rgba(79,195,247,0.25)",
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
              <div className="w-8 h-8 border-2 border-[#4FC3F7] border-t-transparent rounded-full animate-spin"></div>
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
                    style={{ background: "#4FC3F7", color: "#050015" }}
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
                // Detecção de campos ausentes — cada flag controla se o card
                // mostra dado real ou indicador "Não informado" + ícone de alerta.
                const modalidadeAusente = estaAusente(vaga.modalidade);
                const contratoAusente = estaAusente(vaga.tipo_contrato);
                const localizacao = formatarLocalizacao(vaga.city, vaga.state);

                const corMod = modalidadeAusente
                  ? COR_AUSENTE
                  : modalidadeCor[vaga.modalidade] ?? "#A0AEC0";
                const corCont = contratoAusente
                  ? COR_AUSENTE
                  : contratoCor[vaga.tipo_contrato ?? ""] ?? "#94A3B8";
                const corOri = origemCor[vaga.origem] ?? "#94A3B8";

                const prazo = vaga.prazo_inscricao && !estaAusente(vaga.prazo_inscricao)
                  ? corPrazo(vaga.prazo_inscricao)
                  : null;

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
                      <h3 className="text-[16px] font-semibold text-white leading-snug flex-1 group-hover:text-[#4FC3F7] transition-colors">
                        {vaga.titulo}
                      </h3>
                      {/* Badge de modalidade — com ícone de alerta quando ausente */}
                      <span
                        className="text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0 flex items-center gap-1"
                        style={{
                          background: `${corMod}15`,
                          color: corMod,
                          border: `1px solid ${corMod}30`,
                          fontStyle: modalidadeAusente ? "italic" : "normal",
                        }}
                        title={modalidadeAusente ? "Modalidade não informada na vaga original" : undefined}
                      >
                        {modalidadeAusente && <AlertCircle size={10} />}
                        {modalidadeAusente ? "Modalidade não informada" : vaga.modalidade}
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
                      {/* Localização — sempre renderiza, com indicador se ausente */}
                      <span
                        className="text-[11px] flex items-center gap-1"
                        style={{
                          color: localizacao.ausente ? COR_AUSENTE : "#A0AEC0",
                          fontStyle: localizacao.ausente ? "italic" : "normal",
                        }}
                        title={localizacao.ausente ? "Localização não informada na vaga original" : undefined}
                      >
                        {localizacao.ausente ? <AlertCircle size={11} /> : <MapPin size={11} />}
                        {localizacao.texto}
                      </span>

                      {/* Contrato — sempre renderiza, com indicador se ausente */}
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{
                          background: `${corCont}15`,
                          color: corCont,
                          border: `1px solid ${corCont}30`,
                          fontStyle: contratoAusente ? "italic" : "normal",
                        }}
                        title={contratoAusente ? "Tipo de contrato não informado na vaga original" : undefined}
                      >
                        {contratoAusente && <AlertCircle size={10} />}
                        {contratoAusente ? "Contrato não informado" : vaga.tipo_contrato}
                      </span>

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
                      <span className="text-[12px] text-[#4FC3F7] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
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

          {/* Rodapé */}
          {!carregando && (
            <div className="w-full mt-auto pt-8 flex flex-col sm:flex-row items-center justify-between border-t border-[rgba(255,255,255,0.05)] gap-4 text-center sm:text-left">
              <p className="text-[13px] text-[#A0AEC0]">
                Atualizado via Gupy + LinkedIn
              </p>
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
                {vagasFiltradas.length === 1 ? "vaga encontrada" : "vagas encontradas"}
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
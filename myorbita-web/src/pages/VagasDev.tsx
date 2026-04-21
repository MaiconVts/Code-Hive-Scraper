import { useState, useEffect } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MapPin,
  GraduationCap,
  Briefcase,
  Accessibility,
} from "lucide-react";
import { getVagas } from "../services/api";
import type { IVaga } from "../types/IVaga";
import { ROUTES } from "../constants/routes";
import VagaDetalhe from "../components/VagaDetalhe";
import PageTransition from "../components/PageTransition";
import { useFiltrosVagas } from "../hooks/useFiltrosVagas";

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

// Mapa de cores por plataforma de origem.
// Cada plataforma tem cor única para identificação visual rápida.
// Fallback cinza (#94A3B8) para origens não mapeadas (defensive coding).
const origemCor: Record<string, string> = {
  Gupy: "#4FC3F7",     // Azul claro — combina com tema Dev
  LinkedIn: "#0077B5", // Azul oficial LinkedIn
};

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
  const dias = Math.ceil(
    (prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (dias < 0) return { cor: "#F87171", texto: "expirada" };
  if (dias <= 7)
    return { cor: "#FFB703", texto: `até ${formatarData(prazoIso)}` };
  return { cor: "#34D399", texto: `até ${formatarData(prazoIso)}` };
}

const selectBase: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "10px",
};

export default function VagasDev() {
  const [vagasRaw, setVagasRaw] = useState<IVaga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [vagaSelecionada, setVagaSelecionada] = useState<IVaga | null>(null);

  const {
    busca,
    setBusca,
    filtroModalidade,
    setFiltroModalidade,
    ordenacao,
    setOrdenacao,
    filtroEstado,
    setFiltroEstado,
    filtroNivel,
    setFiltroNivel,
    filtroContrato,
    setFiltroContrato,
    filtroPcd,
    setFiltroPcd,
    filtroOrigem,
    setFiltroOrigem,
    estadosDisponiveis,
    contratosDisponiveis,
    origensDisponiveis,
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
      const data = await getVagas([
        ROUTES.FIREBASE_VAGAS_DEV_GUPY,
        ROUTES.FIREBASE_VAGAS_DEV_LINKEDIN,
      ]);
      setVagasRaw(data);
      setCarregando(false);
    })();
  }, []);

  return (
    <PageTransition>
      {/* CSS responsivo para filtros — inline styles não suportam @media */}
      <style>{`
        .filtros-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          width: 100%;
        }
        @media (max-width: 768px) {
          .filtros-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .filtros-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div
        className="min-h-screen w-full flex flex-col items-center pb-16 px-6 lg:px-8 overflow-x-hidden"
        style={{ fontFamily: "'Space Grotesk', sans-serif", marginTop: "64px" }}
      >
        <div className="w-[92%] max-w-[1200px] flex flex-col gap-10">
          {/* Espaçador do header fixo */}
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
                textShadow:
                  "0 0 30px rgba(79,195,247,0.4), 0 0 60px rgba(79,195,247,0.15)",
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
            className="flex flex-col gap-4 px-6 py-5 w-full"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "14px",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Linha 1: Busca + Modalidade + Ordenação */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full overflow-hidden">
              <div className="relative flex-1 flex items-center">
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

              <div
                className="flex items-center gap-1 p-1.5 rounded-[12px] shrink-0"
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
                      className="px-4 py-2 rounded-lg text-[13px] whitespace-nowrap transition-all duration-200"
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
                onChange={(e) =>
                  setOrdenacao(e.target.value as "recente" | "antiga")
                }
                className="h-[44px] px-4 text-[13px] text-white outline-none cursor-pointer shrink-0"
                style={{ ...selectBase }}
              >
                <option value="recente" style={{ color: "#050015" }}>
                  Mais recentes
                </option>
                <option value="antiga" style={{ color: "#050015" }}>
                  Mais antigas
                </option>
              </select>
            </div>

            {/* Linha 2: Filtros avançados — Grid responsivo */}
            <div className="filtros-grid">
              <div className="relative flex items-center">
                <GraduationCap
                  className="absolute left-3 pointer-events-none"
                  size={15}
                  color="#A0AEC0"
                />
                <select
                  value={filtroNivel}
                  onChange={(e) => setFiltroNivel(e.target.value)}
                  className="w-full h-[44px] text-[13px] text-white outline-none cursor-pointer appearance-none"
                  style={{
                    ...selectBase,
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

              <div className="relative flex items-center">
                <MapPin
                  className="absolute left-3 pointer-events-none"
                  size={14}
                  color="#A0AEC0"
                />
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="w-full h-[44px] text-[13px] text-white outline-none cursor-pointer appearance-none"
                  style={{
                    ...selectBase,
                    paddingLeft: "34px",
                    paddingRight: "16px",
                  }}
                >
                  <option value="todos" style={{ color: "#050015" }}>
                    Qualquer Estado
                  </option>
                  {estadosDisponiveis.map((uf) => (
                    <option key={uf} value={uf} style={{ color: "#050015" }}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex items-center">
                <Briefcase
                  className="absolute left-3 pointer-events-none"
                  size={14}
                  color="#A0AEC0"
                />
                <select
                  value={filtroContrato}
                  onChange={(e) => setFiltroContrato(e.target.value)}
                  className="w-full h-[44px] text-[13px] text-white outline-none cursor-pointer appearance-none"
                  style={{
                    ...selectBase,
                    paddingLeft: "34px",
                    paddingRight: "16px",
                  }}
                >
                  <option value="todos" style={{ color: "#050015" }}>
                    Qualquer Contrato
                  </option>
                  {contratosDisponiveis.map((tipo) => (
                    <option
                      key={tipo}
                      value={tipo}
                      style={{ color: "#050015" }}
                    >
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setFiltroPcd(!filtroPcd)}
                className="flex items-center justify-center gap-2 h-[44px] px-4 rounded-[10px] text-[13px] transition-all duration-200 whitespace-nowrap"
                style={{
                  background: filtroPcd
                    ? "rgba(79,195,247,0.15)"
                    : "rgba(255,255,255,0.05)",
                  border: filtroPcd
                    ? "1px solid rgba(79,195,247,0.4)"
                    : "1px solid rgba(255,255,255,0.09)",
                  color: filtroPcd ? "#4FC3F7" : "#A0AEC0",
                  fontWeight: filtroPcd ? 600 : 400,
                }}
              >
                <Accessibility size={14} />
                PCD
              </button>
            </div>

            {/* Linha 3: Toggle de origem (Gupy / LinkedIn) — só aparece se há mais de uma fonte */}
            {origensDisponiveis.length > 1 && (
              <div
                className="flex items-center gap-1 p-1.5 rounded-[12px] self-start"
                style={{
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {/* Botão "Todas" — sempre primeiro */}
                <button
                  onClick={() => setFiltroOrigem("todas")}
                  className="px-4 py-2 rounded-lg text-[13px] whitespace-nowrap transition-all duration-200"
                  style={{
                    background: filtroOrigem === "todas" ? "#FFB703" : "transparent",
                    color: filtroOrigem === "todas" ? "#050015" : "#A0AEC0",
                    fontWeight: filtroOrigem === "todas" ? 600 : 500,
                  }}
                >
                  Todas
                </button>

                {/* Um botão por origem disponível */}
                {origensDisponiveis.map((origem) => {
                  const isActive = filtroOrigem === origem;
                  const cor = origemCor[origem] ?? "#94A3B8";
                  return (
                    <button
                      key={origem}
                      onClick={() => setFiltroOrigem(origem)}
                      className="px-4 py-2 rounded-lg text-[13px] whitespace-nowrap transition-all duration-200"
                      style={{
                        background: isActive ? cor : "transparent",
                        color: isActive ? "#050015" : "#A0AEC0",
                        fontWeight: isActive ? 600 : 500,
                      }}
                    >
                      {origem}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

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

          {/* Grid de Vagas */}
          {!carregando && vagasPagina.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {vagasPagina.map((vaga) => {
                const corMod = modalidadeCor[vaga.modalidade] ?? "#A0AEC0";
                const corCont =
                  contratoCor[vaga.tipo_contrato || ""] ?? "#94A3B8";
                const corOri = origemCor[vaga.origem] ?? "#94A3B8";
                const temLocal = vaga.city && vaga.city !== "Não informado";
                const prazo =
                  vaga.prazo_inscricao &&
                  vaga.prazo_inscricao !== "Não informado"
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
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-[16px] font-semibold text-white leading-snug flex-1 group-hover:text-[#4FC3F7] transition-colors">
                        {vaga.titulo}
                      </h3>
                      <span
                        className="text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0"
                        style={{
                          background: `${corMod}15`,
                          color: corMod,
                          border: `1px solid ${corMod}30`,
                        }}
                      >
                        {vaga.modalidade}
                      </span>
                    </div>

                    {/* Empresa + Badge de origem (Gupy/LinkedIn) */}
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
                          {vaga.city}
                          {vaga.state && vaga.state !== "Não informado"
                            ? `, ${vaga.state}`
                            : ""}
                        </span>
                      )}
                      {vaga.tipo_contrato &&
                        vaga.tipo_contrato !== "Não informado" && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: `${corCont}15`,
                              color: corCont,
                              border: `1px solid ${corCont}30`,
                            }}
                          >
                            {vaga.tipo_contrato}
                          </span>
                        )}
                      {vaga.pcd && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{
                            background: "rgba(52,211,153,0.15)",
                            color: "#34D399",
                            border: "1px solid rgba(52,211,153,0.3)",
                          }}
                        >
                          <Accessibility size={10} />
                          PCD
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[rgba(255,255,255,0.05)]">
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-[#6b7280]">
                          {formatarData(vaga.data_publicacao)}
                        </span>
                        {prazo && (
                          <span
                            className="text-[11px]"
                            style={{ color: prazo.cor }}
                          >
                            {prazo.texto}
                          </span>
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
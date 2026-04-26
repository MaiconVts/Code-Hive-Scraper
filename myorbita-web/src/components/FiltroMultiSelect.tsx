import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

/**
 * Opção individual do dropdown.
 */
export interface OpcaoMultiSelect {
  value: string;
  label: string;
  cor?: string;
}

interface FiltroMultiSelectProps {
  icone?: React.ReactNode;
  placeholder: string;
  opcoes: OpcaoMultiSelect[];
  selecionados: string[];
  onChange: (novosValores: string[]) => void;
  minWidth?: string;
}

/**
 * Dropdown multi-select com checkboxes.
 *
 * Por que usa Portal?
 * O painel suspenso precisa ficar acima de TUDO no app (cards de vagas,
 * outros painéis, etc). Como o componente é renderizado dentro de um
 * container com `backdrop-filter: blur()`, esse container cria um
 * stacking context isolado — z-index alto não funciona pra escapar dele.
 * Solução: renderizar o painel via Portal direto no document.body, que
 * está fora de qualquer stacking context.
 *
 * Posição calculada via getBoundingClientRect() do botão-âncora.
 * Atualiza em scroll/resize para acompanhar o botão na tela.
 */
export default function FiltroMultiSelect({
  icone,
  placeholder,
  opcoes,
  selecionados,
  onChange,
  minWidth = "0",
}: FiltroMultiSelectProps) {
  const [aberto, setAberto] = useState(false);
  const [posicaoPainel, setPosicaoPainel] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  // --- Calcula posição do painel baseado no botão âncora ---
  // Necessário porque o painel está fora da árvore (Portal) e precisa saber
  // onde renderizar. Recalcula em scroll/resize pra acompanhar.
  const atualizarPosicao = () => {
    if (!botaoRef.current) return;
    const rect = botaoRef.current.getBoundingClientRect();
    setPosicaoPainel({
      top: rect.bottom + 4, // 4px de gap abaixo do botão
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (!aberto) return;

    atualizarPosicao();

    // Recalcula em scroll/resize porque o painel é position:fixed (Portal)
    // e precisa acompanhar o botão se a página rolar.
    window.addEventListener("scroll", atualizarPosicao, true);
    window.addEventListener("resize", atualizarPosicao);

    return () => {
      window.removeEventListener("scroll", atualizarPosicao, true);
      window.removeEventListener("resize", atualizarPosicao);
    };
  }, [aberto]);

  // --- Fecha ao clicar fora ---
  // Considera tanto o container do botão quanto o painel (que está em outro
  // lugar da árvore por causa do Portal). Se clicou em qualquer um deles, mantém aberto.
  useEffect(() => {
    if (!aberto) return;

    const handleClickFora = (e: MouseEvent) => {
      const target = e.target as Node;
      const dentroBotao = containerRef.current?.contains(target);
      const dentroPainel = painelRef.current?.contains(target);
      if (!dentroBotao && !dentroPainel) {
        setAberto(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };

    document.addEventListener("mousedown", handleClickFora);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickFora);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [aberto]);

  const toggleOpcao = (value: string) => {
    if (selecionados.includes(value)) {
      onChange(selecionados.filter((v) => v !== value));
    } else {
      onChange([...selecionados, value]);
    }
  };

  const textoBotao = (() => {
    if (selecionados.length === 0) return placeholder;
    if (selecionados.length === 1) {
      const op = opcoes.find((o) => o.value === selecionados[0]);
      return op?.label ?? selecionados[0];
    }
    return `${selecionados.length} selecionados`;
  })();

  const temSelecao = selecionados.length > 0;

  // --- Painel renderizado via Portal ---
  // typeof document !== "undefined" garante SSR-safety se um dia for usado
  // em ambiente sem document (Next.js, etc). Em Vite/CRA puro sempre passa.
  const painel = aberto && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={painelRef}
          style={{
            position: "fixed",
            top: posicaoPainel.top,
            left: posicaoPainel.left,
            width: posicaoPainel.width,
            background: "rgba(15, 15, 35, 0.98)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "10px",
            backdropFilter: "blur(16px)",
            boxShadow: "0 10px 30px -5px rgba(0,0,0,0.5)",
            maxHeight: "280px",
            overflowY: "auto",
            padding: "4px",
            // z-index alto E fora do stacking context dos filtros (Portal escapa).
            // 9999 é folgado pra ficar acima de modal, header sticky, etc.
            zIndex: 9999,
          }}
          role="listbox"
        >
          {opcoes.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-[#6b7280]">
              Nenhuma opção disponível
            </div>
          ) : (
            opcoes.map((opcao) => {
              const marcado = selecionados.includes(opcao.value);
              return (
                <button
                  key={opcao.value}
                  type="button"
                  onClick={() => toggleOpcao(opcao.value)}
                  role="option"
                  aria-selected={marcado}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] rounded-md transition-all text-left"
                  style={{
                    background: marcado
                      ? "rgba(79,195,247,0.12)"
                      : "transparent",
                    color: marcado ? "#FFFFFF" : "#A0AEC0",
                  }}
                  onMouseEnter={(e) => {
                    if (!marcado) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!marcado) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <span
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "4px",
                      border: marcado
                        ? "1px solid #4FC3F7"
                        : "1px solid rgba(255,255,255,0.2)",
                      background: marcado ? "#4FC3F7" : "transparent",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {marcado && <Check size={11} color="#050015" strokeWidth={3} />}
                  </span>

                  {opcao.cor && (
                    <span
                      className="shrink-0"
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: opcao.cor,
                      }}
                    />
                  )}

                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: marcado ? 500 : 400,
                    }}
                  >
                    {opcao.label}
                  </span>
                </button>
              );
            })
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={containerRef} className="relative" style={{ minWidth }}>
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className="w-full h-[44px] flex items-center text-[13px] outline-none cursor-pointer transition-all"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: temSelecao
            ? "1px solid rgba(79,195,247,0.4)"
            : "1px solid rgba(255,255,255,0.09)",
          borderRadius: "10px",
          paddingLeft: icone ? "36px" : "16px",
          paddingRight: "32px",
          color: temSelecao ? "#FFFFFF" : "#A0AEC0",
          fontWeight: temSelecao ? 500 : 400,
          position: "relative",
          textAlign: "left",
        }}
      >
        {icone && (
          <span
            className="absolute left-3 pointer-events-none flex items-center"
            style={{ color: "#A0AEC0" }}
          >
            {icone}
          </span>
        )}
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {textoBotao}
        </span>
        <ChevronDown
          size={14}
          className="absolute right-3 transition-transform"
          style={{
            color: "#A0AEC0",
            transform: aberto ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {painel}
    </div>
  );
}
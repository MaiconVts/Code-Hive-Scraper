interface IProps {
  onClose: () => void;
}

export default function Sobre({ onClose }: IProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '24px',
        fontFamily: "'Space Grotesk', sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: '560px',
          maxHeight: '85vh',
          background: 'rgba(10,5,30,0.97)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '20px',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '28px 32px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
            Sobre o MyOrbita
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', color: '#A0AEC0',
              cursor: 'pointer', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            ×
          </button>
        </div>

        {/* Conteúdo */}
        <div style={{ padding: '28px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          <div>
            <p style={{ fontSize: '14px', color: '#A0AEC0', lineHeight: 1.7, margin: 0 }}>
              Agregador inteligente de vagas profissionais desenvolvido como projeto solo
              de portfólio técnico. Coleta, padroniza e exibe vagas de tecnologia e direito
              em uma interface unificada, atualizada diariamente.
            </p>
          </div>

          <Secao titulo="Autor">
            <strong style={{ color: '#FFFFFF' }}>Maicon Vitor Theodoro da Silva</strong>
            <br />
            Advogado e Desenvolvedor — Vespasiano, MG
            <br />
            <a
              href="https://github.com/MaiconVts/MyOrbita"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4FC3F7', textDecoration: 'none' }}
            >
              github.com/MaiconVts/MyOrbita
            </a>
          </Secao>

          <Secao titulo="Stack Técnica">
            <LinhaStack label="Backend" value="Python 3.11 — Scrapers Gupy (API) e LinkedIn (HTML)" />
            <LinhaStack label="Banco de Dados" value="Firebase Realtime Database" />
            <LinhaStack label="Automação" value="GitHub Actions — execução diária" />
            <LinhaStack label="Frontend" value="React 19 + Vite + TypeScript + Tailwind CSS" />
            <LinhaStack label="Animações" value="Framer Motion + Rive" />
          </Secao>

          <Secao titulo="Fontes de Dados">
            As vagas são coletadas automaticamente todos os dias das plataformas{' '}
            <span style={{ color: '#4FC3F7' }}>Gupy</span> e{' '}
            <span style={{ color: '#0077B5' }}>LinkedIn</span>.
          </Secao>

        </div>
      </div>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#4a4a6a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
        {titulo}
      </p>
      <p style={{ fontSize: '14px', color: '#A0AEC0', lineHeight: 1.7, margin: 0 }}>
        {children}
      </p>
    </div>
  );
}

function LinhaStack({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'block', marginBottom: '6px' }}>
      <span style={{ color: '#ffffff', fontWeight: 600 }}>{label}:</span>{' '}
      {value}
    </span>
  );
}

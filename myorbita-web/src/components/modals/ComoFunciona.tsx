interface IProps {
  onClose: () => void;
}

export default function ComoFunciona({ onClose }: IProps) {
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
            Como Funciona
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
        <div style={{ padding: '28px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0' }}>

          <Etapa
            icone="⚙️"
            titulo="Coleta Automática"
            ultima={false}
          >
            Scrapers Python executam diariamente via GitHub Actions. O scraper da{' '}
            <strong style={{ color: '#4FC3F7' }}>Gupy</strong> consome a API REST oficial.
            O scraper do <strong style={{ color: '#0077B5' }}>LinkedIn</strong> faz parsing
            de HTML com técnicas de anti-detecção (TLS fingerprinting, delays gaussianos,
            circuit breaker).
          </Etapa>

          <Etapa
            icone="🔎"
            titulo="Deduplicação"
            ultima={false}
          >
            Cada vaga recebe um ID determinístico gerado a partir da URL.
            Vagas já existentes no banco não são duplicadas entre execuções —
            garantindo que os dados sejam sempre frescos e sem repetição.
          </Etapa>

          <Etapa
            icone="🗄️"
            titulo="Armazenamento"
            ultima={false}
          >
            As vagas padronizadas são salvas no Firebase Realtime Database,
            organizadas por categoria (Dev / Jurídico) e plataforma (Gupy / LinkedIn).
          </Etapa>

          <Etapa
            icone="⚡"
            titulo="Exibição"
            ultima={true}
          >
            O app React lê os dados diretamente do Firebase. Um cache local
            (TTL 1h) evita requisições desnecessárias. Os filtros são aplicados
            localmente, sem nenhuma chamada extra ao banco.
          </Etapa>

          {/* Horários */}
          <div style={{
            marginTop: '24px',
            padding: '16px 20px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#4a4a6a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Horários de Atualização (BRT)
            </p>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <HorarioItem plataforma="Gupy" horario="03h42" cor="#4FC3F7" />
              <HorarioItem plataforma="LinkedIn" horario="04h45" cor="#0077B5" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function Etapa({ icone, titulo, children, ultima }: {
  icone: string;
  titulo: string;
  children: React.ReactNode;
  ultima: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: '16px', paddingBottom: ultima ? '0' : '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '32px' }}>
        <span style={{ fontSize: '18px', lineHeight: 1 }}>{icone}</span>
        {!ultima && (
          <div style={{ width: '1px', flexGrow: 1, background: 'rgba(255,255,255,0.07)', marginTop: '8px' }} />
        )}
      </div>
      <div style={{ paddingBottom: ultima ? '0' : '4px' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', margin: '0 0 6px' }}>
          {titulo}
        </p>
        <p style={{ fontSize: '13px', color: '#A0AEC0', lineHeight: 1.7, margin: 0 }}>
          {children}
        </p>
      </div>
    </div>
  );
}

function HorarioItem({ plataforma, horario, cor }: { plataforma: string; horario: string; cor: string }) {
  return (
    <div>
      <span style={{ fontSize: '11px', color: '#4a4a6a' }}>{plataforma}</span>
      <p style={{ fontSize: '18px', fontWeight: 700, color: cor, margin: '2px 0 0' }}>{horario}</p>
    </div>
  );
}

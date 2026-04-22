interface IProps {
  onClose: () => void;
}

export default function ComoUsar({ onClose }: IProps) {
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
            Como Usar
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
        <div style={{ padding: '28px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <Passo numero="01" titulo="Escolha sua área">
            Na página inicial, selecione <strong style={{ color: '#4FC3F7' }}>Vagas Dev</strong> para
            Tecnologia & Desenvolvimento ou{' '}
            <strong style={{ color: '#FFB703' }}>Vagas Jurídico</strong> para Direito & Advocacia.
          </Passo>

          <Passo numero="02" titulo="Filtre as vagas">
            Use os filtros disponíveis para refinar sua busca:
            <ul style={{ marginTop: '8px', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Busca textual por título, empresa ou localização</li>
              <li>Modalidade: Remoto, Híbrido ou Presencial</li>
              <li>Nível: Estágio, Júnior, Pleno ou Sênior</li>
              <li>Estado, Tipo de Contrato, PCD e Plataforma de origem</li>
            </ul>
          </Passo>

          <Passo numero="03" titulo="Explore uma vaga">
            Clique em qualquer card para abrir os detalhes completos da vaga —
            empresa, modalidade, localização, contrato, prazo de inscrição e mais.
          </Passo>

          <Passo numero="04" titulo="Candidate-se">
            Dentro do painel de detalhes, clique em{' '}
            <strong style={{ color: '#FFB703' }}>Ver Vaga Completa →</strong>{' '}
            para ser redirecionado ao site original da vaga.
          </Passo>

          <Passo numero="05" titulo="Atualize os dados">
            As vagas são atualizadas automaticamente todos os dias às ~4h (horário de Brasília).
            Para forçar uma atualização manual, clique no botão{' '}
            <strong style={{ color: '#FFFFFF' }}>Atualizar</strong> na barra de filtros.
          </Passo>

        </div>
      </div>
    </div>
  );
}

function Passo({ numero, titulo, children }: { numero: string; titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '16px' }}>
      <span style={{
        fontSize: '11px', fontWeight: 700, color: '#4FC3F7',
        letterSpacing: '0.1em', minWidth: '24px', paddingTop: '2px',
      }}>
        {numero}
      </span>
      <div>
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

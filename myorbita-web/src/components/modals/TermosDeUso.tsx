interface IProps {
  onClose: () => void;
}

export default function TermosDeUso({ onClose }: IProps) {
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
          width: '100%', maxWidth: '600px',
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
            Termos de Uso
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

        {/* Conteúdo scrollável */}
        <div style={{ padding: '28px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          <Secao titulo="1. Sobre o MyOrbita">
            O MyOrbita é uma plataforma de uso pessoal e portfólio técnico que agrega vagas de
            emprego publicamente disponíveis nas plataformas Gupy e LinkedIn, exibindo-as de forma
            consolidada e organizada por área profissional.
          </Secao>

          <Secao titulo="2. Uso da Plataforma">
            A plataforma é disponibilizada gratuitamente para consulta de vagas. É vedado o uso
            comercial, revenda ou reprodução do sistema sem autorização expressa do autor.
          </Secao>

          <Secao titulo="3. Google Analytics">
            Utilizamos o Google Analytics 4 para análise de uso anônima. Os dados coletados
            incluem visualizações de página, tipo de dispositivo, navegador e localização
            geográfica aproximada. Nenhum dado pessoal identificável é coletado ou armazenado
            pelo MyOrbita.
          </Secao>

          <Secao titulo="4. Dados das Vagas">
            As vagas exibidas são coletadas automaticamente de fontes públicas (Gupy e LinkedIn).
            O MyOrbita não garante a disponibilidade, atualidade ou veracidade das informações.
            Sempre verifique no site original antes de candidatar-se.
          </Secao>

          <Secao titulo="5. Propriedade Intelectual">
            O código-fonte do MyOrbita é de propriedade de Maicon Vitor Theodoro da Silva —
            todos os direitos reservados. As informações das vagas pertencem às respectivas
            empresas e plataformas de origem.
          </Secao>

          <Secao titulo="6. Isenção de Responsabilidade">
            O MyOrbita não se responsabiliza por vagas encerradas, informações desatualizadas
            ou quaisquer danos decorrentes do uso da plataforma.
          </Secao>

          <Secao titulo="7. Contato">
            <a
              href="mailto:mvitor142@gmail.com"
              style={{ color: '#4FC3F7', textDecoration: 'none' }}
            >
              mvitor142@gmail.com
            </a>
          </Secao>

          <p style={{ fontSize: '11px', color: '#2e2e4a', margin: 0 }}>
            Última atualização: Abril de 2026
          </p>

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

interface IProps {
  onClose: () => void;
}

export default function PoliticaPrivacidade({ onClose }: IProps) {
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
            Política de Privacidade
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

          <Secao titulo="1. Dados Coletados">
            O MyOrbita não solicita cadastro nem coleta dados pessoais diretamente dos usuários.
            Nenhuma informação de identificação pessoal é armazenada pela plataforma.
          </Secao>

          <Secao titulo="2. Google Analytics 4">
            Utilizamos o Google Analytics 4 para entender como a plataforma é utilizada.
            Os dados coletados são anônimos e incluem: visualizações de página e navegação,
            tipo de dispositivo, sistema operacional e navegador, localização geográfica
            aproximada (nível de cidade) e idioma do navegador. Esses dados são processados
            pelo Google conforme a{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4FC3F7', textDecoration: 'none' }}
            >
              Política de Privacidade do Google
            </a>.
          </Secao>

          <Secao titulo="3. Cookies">
            O Google Analytics utiliza cookies de sessão para análise de uso agregado.
            Esses cookies não identificam você pessoalmente.
          </Secao>

          <Secao titulo="4. Firebase">
            Os dados das vagas são armazenados no Firebase Realtime Database (Google).
            Nenhum dado do usuário é armazenado no Firebase — apenas os dados públicos
            das vagas coletadas.
          </Secao>

          <Secao titulo="5. Compartilhamento">
            Não compartilhamos dados com terceiros além do Google Analytics,
            conforme descrito nesta política.
          </Secao>

          <Secao titulo="6. Seus Direitos (LGPD)">
            Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem
            o direito de confirmar a existência de tratamento de dados, solicitar acesso
            ou eliminação de dados. Entre em contato pelo e-mail abaixo para exercer
            esses direitos.
          </Secao>

          <Secao titulo="7. Encarregado (DPO)">
            Maicon Vitor Theodoro da Silva{'\n'}
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
      <p style={{ fontSize: '14px', color: '#A0AEC0', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
        {children}
      </p>
    </div>
  );
}

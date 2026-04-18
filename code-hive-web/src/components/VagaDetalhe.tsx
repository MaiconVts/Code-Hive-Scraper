import type { IVaga } from '../types/IVaga';

interface IVagaDetalheProps {
  vaga: IVaga;
  onClose: () => void;
}

function formatarData(iso: string): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR'); }
  catch { return iso; }
}

const modalidadeCor: Record<string, string> = {
  Remoto: '#4FC3F7', 'Home Office': '#4FC3F7',
  Híbrido: '#FFB703', Presencial: '#FFFFFF', Teletrabalho: '#4FC3F7',
};

export default function VagaDetalhe({ vaga, onClose }: IVagaDetalheProps) {
  const cor = modalidadeCor[vaga.modalidade] ?? '#FFFFFF';

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: '560px',
          background: 'rgba(10,5,30,0.95)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '20px',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          padding: '32px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão fechar */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '20px', right: '20px',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#A0AEC0', cursor: 'pointer',
            width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Título */}
        <h2 style={{
          fontSize: '22px', fontWeight: 700,
          color: '#FFFFFF', marginBottom: '20px',
          paddingRight: '40px', lineHeight: 1.3,
          fontFamily: "'Space Grotesk', sans-serif",
        }}>
          {vaga.titulo}
        </h2>

        {/* Infos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'EMPRESA',    value: vaga.empresa },
            { label: 'MODALIDADE', value: vaga.modalidade, color: cor },
            { label: 'PUBLICADO',  value: formatarData(vaga.data_publicacao) },
            { label: 'ORIGEM',     value: vaga.origem },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{
                fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em',
                color: '#4a4a6a', minWidth: '90px', textTransform: 'uppercase',
              }}>
                {label}
              </span>
              <span style={{ fontSize: '15px', color: color ?? '#FFFFFF', fontWeight: 400 }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <a
          href={vaga.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', width: '100%',
            background: '#FFB703', color: '#050015',
            textAlign: 'center', fontWeight: 700,
            fontSize: '15px', padding: '14px',
            borderRadius: '12px', textDecoration: 'none',
            fontFamily: "'Space Grotesk', sans-serif",
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#4FC3F7'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#FFB703'; }}
        >
          Ver Vaga Completa →
        </a>
      </div>
    </div>
  );
}
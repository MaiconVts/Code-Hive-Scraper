import { MapPin, Briefcase, Accessibility, Clock } from 'lucide-react';
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

/**
 * Verifica se um campo opcional tem valor útil (não nulo, não vazio, não "Não informado").
 */
function campoValido(valor?: string | boolean): boolean {
  if (valor === undefined || valor === null) return false;
  if (typeof valor === 'boolean') return true;
  return valor.trim() !== '' && valor !== 'Não informado';
}

/**
 * Calcula o status do prazo e retorna cor + texto adequados.
 */
function statusPrazo(prazo: string): { cor: string; texto: string } {
  const hoje = new Date();
  const dataPrazo = new Date(prazo);
  const diasRestantes = Math.ceil((dataPrazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) return { cor: '#F87171', texto: 'Expirada' };
  if (diasRestantes <= 7) return { cor: '#FFB703', texto: `${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}` };
  return { cor: '#34D399', texto: formatarData(prazo) };
}

const modalidadeCor: Record<string, string> = {
  Remoto: '#4FC3F7',
  Híbrido: '#FFB703',
  Presencial: '#FFFFFF',
};

const contratoCor: Record<string, string> = {
  CLT: '#4FC3F7',
  PJ: '#FFB703',
  Estágio: '#A78BFA',
  'Jovem Aprendiz': '#34D399',
  Temporário: '#F87171',
  Freelancer: '#FB923C',
  Autônomo: '#FB923C',
  'Banco de Talentos': '#94A3B8',
};

export default function VagaDetalhe({ vaga, onClose }: IVagaDetalheProps) {
  const cor = modalidadeCor[vaga.modalidade] ?? '#FFFFFF';

  // Monta localização legível
  const temCidade = campoValido(vaga.city);
  const temEstado = campoValido(vaga.state);
  const localizacao = temCidade && temEstado
    ? `${vaga.city}, ${vaga.state}`
    : temCidade ? vaga.city!
    : temEstado ? vaga.state!
    : null;

  // Status do prazo
  const prazo = campoValido(vaga.prazo_inscricao) ? statusPrazo(vaga.prazo_inscricao!) : null;

  // Campos estruturados para o grid de informações
  const campos = [
    { label: 'EMPRESA', value: vaga.empresa },
    { label: 'MODALIDADE', value: vaga.modalidade, color: cor },
    { label: 'PUBLICADO', value: formatarData(vaga.data_publicacao) },
    { label: 'ORIGEM', value: vaga.origem },
  ];

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

        {/* Campos principais */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {campos.map(({ label, value, color }) => (
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

        {/* Badges informativos */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '8px',
          marginBottom: '24px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Localização */}
          {localizacao && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '12px', color: '#A0AEC0',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px', padding: '6px 12px',
            }}>
              <MapPin size={12} />
              {localizacao}
            </span>
          )}

          {/* Tipo de contrato */}
          {campoValido(vaga.tipo_contrato) && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '12px', fontWeight: 600,
              color: contratoCor[vaga.tipo_contrato!] ?? '#94A3B8',
              background: `${contratoCor[vaga.tipo_contrato!] ?? '#94A3B8'}15`,
              border: `1px solid ${contratoCor[vaga.tipo_contrato!] ?? '#94A3B8'}30`,
              borderRadius: '8px', padding: '6px 12px',
            }}>
              <Briefcase size={12} />
              {vaga.tipo_contrato}
            </span>
          )}

          {/* PCD */}
          {vaga.pcd && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '12px', fontWeight: 600,
              color: '#34D399',
              background: 'rgba(52,211,153,0.15)',
              border: '1px solid rgba(52,211,153,0.3)',
              borderRadius: '8px', padding: '6px 12px',
            }}>
              <Accessibility size={12} />
              PCD
            </span>
          )}

          {/* Prazo de inscrição */}
          {prazo && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '12px', fontWeight: 600,
              color: prazo.cor,
              background: `${prazo.cor}15`,
              border: `1px solid ${prazo.cor}30`,
              borderRadius: '8px', padding: '6px 12px',
            }}>
              <Clock size={12} />
              {prazo.texto}
            </span>
          )}
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
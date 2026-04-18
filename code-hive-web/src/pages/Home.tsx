import { Link } from "react-router-dom";
import { Scale, Code2 } from "lucide-react";
import PageTransition from "../components/PageTransition";

export default function Home() {
  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center px-12 pt-20 pb-12"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >

        {/* Eyebrow */}
        <p className="text-[11px] text-[#4FC3F7] tracking-[0.3em] uppercase font-medium mb-5">
          Agregador de Vagas Remotas
        </p>

        {/* Título */}
        <h1
          className="text-[80px] font-bold text-white leading-none text-center mb-6"
          style={{
            letterSpacing: '-1px',
            textShadow: '0 0 40px rgba(79,195,247,0.35), 0 0 80px rgba(79,195,247,0.15)',
          }}
        >
          MyOrbita
        </h1>

        {/* Subtítulo */}
        <p className="text-[18px] text-[#A0AEC0] font-normal leading-[1.7] text-center max-w-[440px] mb-16">
          Encontre vagas remotas em tecnologia e direito — atualizadas diariamente.
        </p>

        {/* Cards */}
        <div className="flex items-stretch justify-center gap-6 flex-wrap">

          {/* Card Dev */}
          <Link to="/vagas-dev" className="no-underline">
            <div
              className="w-[280px] flex flex-col items-center justify-center gap-4 p-10 rounded-[20px] cursor-pointer transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                minHeight: '210px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.border = '1px solid rgba(79,195,247,0.6)';
                e.currentTarget.style.boxShadow = '0 8px 48px rgba(79,195,247,0.15)';
                e.currentTarget.style.background = 'rgba(79,195,247,0.06)';
                e.currentTarget.style.transform = 'scale(1.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Code2 size={40} color="#4FC3F7" strokeWidth={1.5} />
              <span className="text-[20px] font-semibold text-white text-center">
                Vagas Dev
              </span>
              <span className="text-[13px] font-normal text-[#A0AEC0] text-center leading-relaxed">
                Tecnologia & Desenvolvimento
              </span>
            </div>
          </Link>

          {/* Card Jurídico */}
          <Link to="/vagas-adv" className="no-underline">
            <div
              className="w-[280px] flex flex-col items-center justify-center gap-4 p-10 rounded-[20px] cursor-pointer transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                minHeight: '210px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.border = '1px solid rgba(255,183,3,0.6)';
                e.currentTarget.style.boxShadow = '0 8px 48px rgba(255,183,3,0.15)';
                e.currentTarget.style.background = 'rgba(255,183,3,0.06)';
                e.currentTarget.style.transform = 'scale(1.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Scale size={40} color="#FFB703" strokeWidth={1.5} />
              <span className="text-[20px] font-semibold text-white text-center">
                Vagas Jurídico
              </span>
              <span className="text-[13px] font-normal text-[#A0AEC0] text-center leading-relaxed">
                Direito & Advocacia
              </span>
            </div>
          </Link>

        </div>

        {/* Rodapé */}
        <p className="text-[11px] text-[#2e2e4a] tracking-[0.2em] uppercase mt-16">
          Fonte: Gupy · Atualizado diariamente
        </p>

      </div>
    </PageTransition>
  );
}
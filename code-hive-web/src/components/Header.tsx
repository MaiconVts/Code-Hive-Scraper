import { Link, useLocation } from 'react-router-dom';

const links = [
  { to: '/',          label: 'Início' },
  { to: '/vagas-dev', label: 'Vagas Dev' },
  { to: '/vagas-adv', label: 'Vagas Jurídico' },
];

export default function Header() {
  const { pathname } = useLocation();

  return (
    <header style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100%',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
      background: 'rgba(5,0,21,0.75)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      zIndex: 500,
      boxSizing: 'border-box',
      fontFamily: "'Space Grotesk', sans-serif",
    }}>

      {/* Logo */}
      <Link to="/" style={{
        fontSize: '22px',
        fontWeight: 700,
        color: '#FFFFFF',
        textDecoration: 'none',
        letterSpacing: '-0.3px',
        fontFamily: "'Space Grotesk', sans-serif",
        textShadow: '0 0 20px rgba(79,195,247,0.5)',
        transition: 'opacity 0.2s',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
      >
        MyOrbita
      </Link>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {links.map(({ to, label }) => {
          const isActive = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              style={{
                position: 'relative',
                padding: '6px 16px',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                fontFamily: "'Space Grotesk', sans-serif",
                color: isActive ? '#FFFFFF' : '#A0AEC0',
                textDecoration: 'none',
                borderRadius: '8px',
                background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                transition: 'all 0.2s ease',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#A0AEC0';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {label}
              {isActive && (
                <span style={{
                  position: 'absolute',
                  bottom: '-1px',
                  left: '16px',
                  right: '16px',
                  height: '2px',
                  background: '#FFFFFF',
                  borderRadius: '2px',
                }} />
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
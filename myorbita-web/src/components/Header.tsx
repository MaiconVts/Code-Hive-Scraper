import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

const links = [
  { to: '/',          label: 'Início' },
  { to: '/vagas-dev', label: 'Vagas Dev' },
  { to: '/vagas-adv', label: 'Vagas Jurídico' },
];

export default function Header() {
  const { pathname } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <>
      {/* CSS responsivo inline via <style> — necessário porque inline styles não suportam @media */}
      <style>{`
        .header-nav {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .header-nav-link {
          padding: 6px 16px;
          font-size: 14px;
          font-family: 'Space Grotesk', sans-serif;
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.2s ease;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }
        .header-hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
          padding: 4px;
          background: none;
          border: none;
        }
        .header-hamburger span {
          display: block;
          width: 22px;
          height: 2px;
          background: #A0AEC0;
          border-radius: 2px;
          transition: all 0.3s ease;
        }
        .header-mobile-menu {
          display: none;
        }

        @media (max-width: 520px) {
          .header-nav {
            display: none;
          }
          .header-hamburger {
            display: flex;
          }
          .header-mobile-menu {
            display: flex;
            position: fixed;
            top: 64px;
            left: 0;
            width: 100%;
            flex-direction: column;
            background: rgba(5,0,21,0.95);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255,255,255,0.07);
            padding: 8px 0;
            z-index: 499;
          }
          .header-mobile-link {
            padding: 14px 24px;
            font-size: 15px;
            font-family: 'Space Grotesk', sans-serif;
            text-decoration: none;
            color: #A0AEC0;
            transition: all 0.2s;
            border-left: 3px solid transparent;
          }
          .header-mobile-link-active {
            color: #FFFFFF;
            background: rgba(255,255,255,0.04);
            border-left: 3px solid #FFB703;
          }
        }
      `}</style>

      <header style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'rgba(5,0,21,0.95)',
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
          flexShrink: 0,
        }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          MyOrbita
        </Link>

        {/* Nav Desktop */}
        <nav className="header-nav">
          {links.map(({ to, label }) => {
            const isActive = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className="header-nav-link"
                style={{
                  position: 'relative',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#FFFFFF' : '#A0AEC0',
                  background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                  border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
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

        {/* Hamburger Mobile */}
        <button
          className="header-hamburger"
          onClick={() => setMenuAberto(!menuAberto)}
          aria-label="Menu"
        >
          <span style={{
            transform: menuAberto ? 'rotate(45deg) translateY(7px)' : 'none',
          }} />
          <span style={{
            opacity: menuAberto ? 0 : 1,
          }} />
          <span style={{
            transform: menuAberto ? 'rotate(-45deg) translateY(-7px)' : 'none',
          }} />
        </button>
      </header>

      {/* Menu Mobile Dropdown */}
      {menuAberto && (
        <div className="header-mobile-menu">
          {links.map(({ to, label }) => {
            const isActive = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`header-mobile-link ${isActive ? 'header-mobile-link-active' : ''}`}
                onClick={() => setMenuAberto(false)}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'

export function AuthLeftPanel({ sticky = false }: { sticky?: boolean }) {
  return (
    <>
      <style>{`
        @keyframes auth-orb-1 {
          0%, 100% { transform: translate(-8%, -8%) scale(1); }
          50%       { transform: translate(8%, 12%) scale(1.25); }
        }
        @keyframes auth-orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1.1); }
          33%       { transform: translate(-12%, 8%) scale(0.85); }
          66%       { transform: translate(12%, -12%) scale(1.35); }
        }
        @keyframes auth-orb-3 {
          0%, 100% { transform: translate(6%, 4%) scale(1); }
          50%       { transform: translate(-8%, -8%) scale(1.2); }
        }
        @keyframes auth-orb-4 {
          0%, 100% { transform: translate(-5%, 10%) scale(0.9); }
          50%       { transform: translate(8%, -5%) scale(1.1); }
        }
        @keyframes auth-shimmer {
          0%, 100% { opacity: 0.15; }
          50%       { opacity: 0.35; }
        }
      `}</style>

      <div
        className={[
          'relative overflow-hidden flex-shrink-0',
          'h-36 md:w-1/2',
          sticky ? 'md:sticky md:top-0 md:self-start md:h-screen' : 'md:min-h-screen',
        ].join(' ')}
        style={{ background: '#080a10' }}
      >
        {/* Orb 1 — roxo principal, grande, lento */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '70%', height: '70%',
            top: '5%', left: '-10%',
            background: 'radial-gradient(circle, rgba(113,50,245,0.7) 0%, rgba(91,30,207,0.3) 40%, transparent 70%)',
            filter: 'blur(48px)',
            animation: 'auth-orb-1 12s ease-in-out infinite',
          }}
        />

        {/* Orb 2 — índigo profundo, canto inferior direito */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '55%', height: '55%',
            bottom: '10%', right: '-5%',
            background: 'radial-gradient(circle, rgba(59,33,184,0.65) 0%, rgba(30,58,138,0.3) 50%, transparent 70%)',
            filter: 'blur(52px)',
            animation: 'auth-orb-2 16s ease-in-out infinite',
          }}
        />

        {/* Orb 3 — violeta suave, centro */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '45%', height: '45%',
            top: '40%', left: '30%',
            background: 'radial-gradient(circle, rgba(145,112,240,0.5) 0%, transparent 65%)',
            filter: 'blur(36px)',
            animation: 'auth-orb-3 9s ease-in-out infinite',
          }}
        />

        {/* Orb 4 — azul elétrico, canto inferior esquerdo */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '40%', height: '40%',
            bottom: '5%', left: '5%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.4) 0%, transparent 65%)',
            filter: 'blur(44px)',
            animation: 'auth-orb-4 11s ease-in-out infinite',
          }}
        />

        {/* Shimmer diagonal */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(113,50,245,0.1) 0%, transparent 50%, rgba(37,99,235,0.08) 100%)',
            animation: 'auth-shimmer 6s ease-in-out infinite',
          }}
        />

        {/* Dot texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Grain noise — dá textura premium ao gradiente */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.035]"
          aria-hidden="true"
        >
          <filter id="auth-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#auth-grain)" />
        </svg>

        {/* Mobile: logo centralizado */}
        <div className="relative z-10 md:hidden flex items-center justify-center h-full">
          <Link to="/">
            <img src={logo} alt="Liga de TI" className="h-9 brightness-0 invert" />
          </Link>
        </div>

        {/* Desktop: logo topo esquerdo, texto rodapé esquerdo */}
        <div className="relative z-10 hidden md:flex flex-col justify-between min-h-screen w-full p-10">
          <Link to="/" className="self-start">
            <img src={logo} alt="Liga de TI" className="h-12 w-auto brightness-0 invert" />
          </Link>

          <div className="max-w-md">
            <h2 className="font-display leading-tight tracking-tight">
              <span className="block text-4xl font-light text-white/70">Transforme</span>
              <span className="block text-4xl font-semibold text-white">ideias em código</span>
            </h2>
            <p className="font-ui font-light text-base text-white/50 mt-3">
              Hackathon Liga de TI — 13 de junho de 2026
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

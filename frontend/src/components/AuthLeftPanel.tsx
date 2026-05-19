import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'

export function AuthLeftPanel({ sticky = false }: { sticky?: boolean }) {
  return (
    <div
      className={[
        'relative overflow-hidden flex-shrink-0 bg-ink',
        'h-36 md:w-1/2',
        sticky ? 'md:sticky md:top-0 md:self-start md:h-screen' : 'md:min-h-screen',
      ].join(' ')}
    >
      <div className="purple-beam left-[28%] top-[-34%] opacity-90" />
      <div className="purple-beam-soft right-[-18rem] bottom-[-22%]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_42%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_24%,rgba(113,50,245,0.28),transparent_24rem)]" />

      <div className="relative z-10 md:hidden flex items-center justify-center h-full">
        <Link to="/">
          <img src={logo} alt="Liga de TI" className="h-9 brightness-0 invert" />
        </Link>
      </div>

      <div className="relative z-10 hidden md:flex flex-col justify-between min-h-screen w-full p-10">
        <Link to="/" className="self-start">
          <img src={logo} alt="Liga de TI" className="h-12 w-auto brightness-0 invert" />
        </Link>

        <div className="max-w-md">
          <p className="kicker mb-4">Hackathon Liga de TI</p>
          <h2 className="font-display leading-[0.92] tracking-normal">
            <span className="block text-6xl font-normal text-white/72">Ideias</span>
            <span className="block text-6xl font-semibold text-white">em código</span>
          </h2>
          <p className="font-ui text-base text-white/52 mt-5">
            13 de junho de 2026. Equipes de 4 pessoas, uma maratona para construir sob pressão real.
          </p>
        </div>
      </div>
    </div>
  )
}

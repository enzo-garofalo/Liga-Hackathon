import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}

export function AuthLayout({ title, subtitle, children, footer, wide = false }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div
        className={[
          'bg-white rounded-2xl border border-[#dedee5] shadow-whisper p-8 w-full',
          wide ? 'max-w-2xl' : 'max-w-md',
        ].join(' ')}
      >
        <Link to="/" className="flex items-center gap-3 mb-6">
          <img src={logo} alt="Liga de TI" className="h-7" />
          <span className="font-display font-semibold text-near-black">Liga de TI</span>
        </Link>
        <h1 className="font-display text-2xl font-semibold text-near-black mb-1">{title}</h1>
        {subtitle && <p className="text-sm text-silver-blue font-ui mb-6">{subtitle}</p>}
        {!subtitle && <div className="mb-6" />}
        {children}
        {footer && <div className="mt-6 text-sm font-ui">{footer}</div>}
      </div>
    </div>
  )
}

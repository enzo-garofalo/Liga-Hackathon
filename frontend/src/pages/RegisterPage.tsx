import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'

export function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-[#dedee5] shadow-whisper p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} alt="Liga de TI" className="h-7" />
          <span className="font-display font-semibold text-near-black">Liga de TI</span>
        </div>
        <h1 className="font-display text-2xl font-semibold text-near-black mb-2">
          Cadastro
        </h1>
        <p className="text-sm text-silver-blue font-ui mb-6">
          Formulário em construção — chega na próxima fase.
        </p>
        <p className="text-sm font-ui">
          Já tem conta?{' '}
          <Link to="/login" className="text-brand hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

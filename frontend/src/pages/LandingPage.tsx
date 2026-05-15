import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'
import { Button } from '../components/ui/Button'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-[#dedee5] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <img src={logo} alt="Liga de TI" className="h-7" />
          <span className="font-display font-semibold text-near-black">Liga de TI</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-5xl font-semibold text-near-black mb-4">
          Hackathon da Liga de TI
        </h1>
        <p className="text-silver-blue font-ui text-lg mb-10">
          Forme sua equipe, mostre seu projeto e participe da competição.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/register">
            <Button variant="primary">Cadastrar</Button>
          </Link>
          <Link to="/login">
            <Button variant="outlined">Entrar</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}

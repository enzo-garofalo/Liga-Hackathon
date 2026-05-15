import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui/Button'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
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
          <Link to="/info">
            <Button variant="ghost">Sobre o hackathon</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}

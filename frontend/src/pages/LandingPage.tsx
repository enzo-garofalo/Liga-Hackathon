import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar, Clock, MapPin, Users,
  Network, Briefcase, Trophy,
  ChevronDown,
  UserPlus, Send, Code2, ArrowRight,
  UserCheck, ShieldX, ShieldAlert, Code,
} from 'lucide-react'
import logo from '../assets/logo.svg'
import { Button } from '../components/ui/Button'

/* MOCK DATA */
const EVENT_DATE = new Date('2026-06-13T09:00:00')
const WHATSAPP_LINK = (import.meta as unknown as { env: Record<string, string> }).env.VITE_WHATSAPP_LINK || '#'

/* MOCK DATA */
const SCHEDULE = [
  { time: '09:00', label: 'Recepção dos participantes',        desc: 'Credenciamento e boas-vindas' },
  { time: '10:00', label: 'Abertura e keynote',                desc: 'Apresentação do desafio e regras do dia' },
  { time: '10:30', label: 'Início do desenvolvimento',         desc: 'Mãos à obra! Começa o coding' },
  { time: '13:00', label: 'Almoço',                            desc: 'Pausa para recarregar as energias' },
  { time: '14:00', label: 'Retorno + checkpoint com mentores', desc: 'Mentores disponíveis para feedback' },
  { time: '17:00', label: 'Deadline de submissão dos projetos',desc: 'Último momento para submeter o projeto' },
  { time: '17:30', label: 'Apresentações para a banca',        desc: '5 minutos por equipe para a banca' },
  { time: '19:00', label: 'Premiação e encerramento',          desc: 'Resultado final e networking', highlight: true },
]

/* MOCK DATA */
const RULES = [
  { icon: Users,        text: 'Equipes de exatamente 4 pessoas — nem mais, nem menos.',              warn: false },
  { icon: Calendar,     text: 'Prazo para formação e submissão da equipe: até 30/05/2026.',          warn: false },
  { icon: Trophy,       text: 'Máximo de 10 equipes aprovadas para o evento.',                       warn: false },
  { icon: UserCheck,    text: 'Cada participante pode integrar apenas uma equipe.',                  warn: false },
  { icon: Code,         text: 'O código deve ser desenvolvido inteiramente durante o hackathon.',    warn: false },
  { icon: ShieldAlert,  text: 'Projetos com código pré-existente serão desclassificados.',           warn: true  },
  { icon: MapPin,       text: 'Todos os integrantes devem estar presentes no dia do evento.',        warn: false },
]

/* MOCK DATA */
const FAQS = [
  {
    q: 'Preciso saber programar para participar?',
    a: 'Sim. O hackathon é voltado para estudantes de cursos de tecnologia e afins. Recomendamos ao menos conhecimento básico em alguma linguagem de programação.',
  },
  {
    q: 'Posso participar sozinho?',
    a: 'Não. A participação é exclusivamente em equipes de exatamente 4 membros. Você pode formar sua equipe na plataforma ou entrar em uma equipe que esteja com vagas abertas.',
  },
  {
    q: 'O que acontece se minha equipe não for aprovada?',
    a: 'As equipes são aprovadas por ordem de submissão, até o limite de 10. Se sua equipe não for aprovada dentro do prazo, os membros ficam livres para integrar outras equipes ou tentar submeter novamente.',
  },
  {
    q: 'Tem custo de inscrição?',
    a: 'Não! A participação no Hackathon Liga de TI é totalmente gratuita para todos os estudantes inscritos.',
  },
  {
    q: 'O que devo levar no dia?',
    a: 'Leve seu notebook, carregador e qualquer periférico que você precise. Haverá wi-fi disponível. Água e lanches serão fornecidos pela organização.',
  },
  {
    q: 'Como funciona a avaliação dos projetos?',
    a: 'Os projetos são avaliados por uma banca composta por profissionais da área de tecnologia. Os critérios incluem inovação, usabilidade, qualidade técnica e apresentação.',
  },
]

// ─── Countdown ────────────────────────────────────────────────────────────────

function getTimeLeft(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now())
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(target))
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft(target)), 1000)
    return () => clearInterval(id)
  }, [target])
  return timeLeft
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function SectionTitle({ light, bold, dark = false }: { light: string; bold: string; dark?: boolean }) {
  return (
    <h2 className="font-display leading-tight tracking-tight mb-10">
      <span className={`block text-4xl font-light ${dark ? 'text-white/60' : 'text-[#9497a9]'}`}>{light}</span>
      <span className={`block text-4xl font-semibold ${dark ? 'text-white' : 'text-[#101114]'}`}>{bold}</span>
    </h2>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const { days, hours, minutes, seconds } = useCountdown(EVENT_DATE)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 40%, #7132f5 100%)' }}
    >
      <style>{`
        @keyframes hero-breathe-a {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%       { opacity: 0.9;  transform: scale(1.18); }
        }
        @keyframes hero-breathe-b {
          0%, 100% { opacity: 0.9;  transform: scale(1.18); }
          50%       { opacity: 0.55; transform: scale(1); }
        }
        @keyframes hero-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-12px); }
        }
      `}</style>

      {/* Animated gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(113,50,245,0.6) 0%, transparent 65%)', filter: 'blur(64px)', animation: 'hero-breathe-a 8s ease-in-out infinite' }} />
        <div className="absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(48,43,99,0.8) 0%, transparent 65%)', filter: 'blur(80px)', animation: 'hero-breathe-b 8s ease-in-out infinite' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(145,112,240,0.35) 0%, transparent 65%)', filter: 'blur(48px)', animation: 'hero-breathe-a 12s ease-in-out infinite' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      </div>

      {/* Nav — transparente no topo, opaco ao scrollar */}
      <nav className={`sticky top-0 z-50 border-b border-white/10 transition-all duration-300 ${scrolled ? 'bg-[#101114]/90 backdrop-blur-md' : 'bg-transparent backdrop-blur-sm'}`}>
        <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-20 flex items-center justify-between h-16">
          <Link to="/">
            <img src={logo} alt="Liga de TI" className="h-7 brightness-0 invert" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-ui text-white/70">
            <a href="#sobre" className="hover:text-white transition-colors">Sobre</a>
            <a href="#cronograma" className="hover:text-white transition-colors">Cronograma</a>
            <a href="#regras" className="hover:text-white transition-colors">Regras</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <Link to="/register">
            <Button variant="primary" className="h-9 text-sm">Inscrever-se</Button>
          </Link>
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div style={{ animation: 'hero-float 6s ease-in-out infinite' }}>
          <h1 className="font-display leading-tight tracking-tight mb-4">
            <span className="block text-5xl md:text-7xl font-light text-white/70">Hackathon</span>
            <span className="block text-5xl md:text-7xl font-semibold text-white">Liga de TI</span>
          </h1>
          {/* MOCK DATA */}
          <p className="font-ui font-light text-xl text-white/60 mb-10">
            Transforme ideias em código. &nbsp;13 de junho de 2026.
          </p>
        </div>

        {/* Countdown com separadores ":" */}
        <div className="flex items-center gap-2 mb-10 flex-wrap justify-center">
          {[
            { value: days, label: 'Dias' },
            { value: hours, label: 'Horas' },
            { value: minutes, label: 'Min' },
            { value: seconds, label: 'Seg' },
          ].map(({ value, label }, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="bg-white/10 backdrop-blur rounded-xl px-5 py-3 min-w-[80px]">
                <div className="font-display text-4xl font-semibold text-white tabular-nums">{pad(value)}</div>
                <div className="text-xs text-white/50 uppercase tracking-wider font-ui mt-1">{label}</div>
              </div>
              {i < 3 && (
                <span className="font-display text-2xl font-light text-white/30 -mt-4 select-none">:</span>
              )}
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Link to="/register">
            <Button variant="primary" className="h-14 px-8 text-lg font-semibold shadow-xl">
              Criar conta
            </Button>
          </Link>
          <Link to="/login">
            <button className="h-14 px-8 text-lg font-ui font-medium rounded-xl border border-white/40 text-white hover:bg-white/10 transition-colors">
              Já tenho conta
            </button>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Info bar ─────────────────────────────────────────────────────────────────

function InfoBar() {
  /* MOCK DATA */
  const items = [
    { icon: Calendar, label: 'Data', value: '13 de junho de 2026' },
    { icon: Clock, label: 'Horário', value: '10h às 19h' },
    { icon: MapPin, label: 'Local', value: 'Av. Alan Turing, 776 — WeHandle' },
    { icon: Users, label: 'Vagas', value: '10 equipes (4 membros)' },
  ]

  return (
    <div className="bg-[#101114] py-8 px-6 md:px-12 lg:px-20">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-0">
        {items.map(({ icon: Icon, label, value }, i) => (
          <div
            key={label}
            className={`flex items-start gap-3 px-6 py-2 ${i < 3 ? 'md:border-r md:border-white/10' : ''}`}
          >
            <Icon className="w-5 h-5 text-[#7132f5] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-white/40 font-ui uppercase tracking-widest">{label}</p>
              <p className="text-sm text-white font-ui mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── About ────────────────────────────────────────────────────────────────────

function About() {
  /* MOCK DATA */
  const benefits = [
    {
      icon: Network,
      title: 'Networking',
      desc: 'Conecte-se com desenvolvedores, designers e empresas da região. Construa relacionamentos que vão além do hackathon.',
    },
    {
      icon: Briefcase,
      title: 'Experiência real',
      desc: 'Pratique resolução de problemas sob pressão, trabalho em equipe e entrega de produto — habilidades valorizadas pelo mercado.',
    },
    {
      icon: Trophy,
      title: 'Premiação',
      desc: 'As melhores equipes são premiadas. Além do reconhecimento, há prêmios em dinheiro e oportunidades com empresas parceiras.',
    },
  ]

  return (
    <section id="sobre" className="bg-white py-24 px-6 md:px-12 lg:px-20">
      <div className="max-w-6xl mx-auto">
        <SectionTitle light="Por que" bold="participar?" />

        {/* MOCK DATA */}
        <div className="grid md:grid-cols-2 gap-8 mb-14">
          <p className="font-ui text-[#9497a9] leading-relaxed">
            O Hackathon Liga de TI é uma maratona de programação organizada para estudantes de cursos de tecnologia. Em um único dia, equipes de 4 pessoas colaboram para criar soluções inovadoras para problemas reais propostos pela organização.
          </p>
          <p className="font-ui text-[#9497a9] leading-relaxed">
            Diferente de projetos acadêmicos, aqui você tem tempo limitado, pressão real e a chance de mostrar o que sabe fazer. É o ambiente ideal para crescer como profissional, aprender com os melhores e colocar sua criatividade à prova.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-[#dedee5] rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-[#7132f5]/10 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-[#7132f5]" />
              </div>
              <h3 className="font-display font-semibold text-[#101114] text-lg mb-2">{title}</h3>
              <p className="font-ui text-sm text-[#9497a9] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How it works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  /* MOCK DATA */
  const steps = [
    { n: '01', icon: UserPlus, title: 'Crie sua conta', desc: 'Cadastre-se na plataforma com seu e-mail institucional ou pessoal.' },
    { n: '02', icon: Users,    title: 'Monte sua equipe', desc: 'Convide membros pelo nome ou entre em uma equipe que esteja com vagas abertas.' },
    { n: '03', icon: Send,     title: 'Submeta sua equipe', desc: 'Com os 4 integrantes confirmados, submeta até 30/05/2026 para garantir sua vaga.' },
    { n: '04', icon: Code2,    title: 'Participe do hackathon', desc: 'Compareça no dia 13/06, desenvolva sua solução e apresente para a banca avaliadora.' },
  ]

  const Card = ({ n, icon: Icon, title, desc }: typeof steps[0]) => (
    <div className="group relative overflow-hidden bg-white border border-[#dedee5] rounded-2xl p-6 h-full flex flex-col min-h-[220px] hover:border-[#7132f5]/30 hover:shadow-lg hover:translate-y-[-4px] transition-all duration-300">
      {/* Número marca d'água */}
      <span className="absolute top-3 right-5 font-display font-semibold text-7xl text-[#7132f5]/10 group-hover:text-[#7132f5]/20 transition-colors select-none pointer-events-none leading-none">
        {n}
      </span>
      {/* Ícone */}
      <div className="w-12 h-12 bg-[#7132f5]/10 rounded-xl flex items-center justify-center group-hover:bg-[#7132f5] transition-colors duration-300 flex-shrink-0">
        <Icon className="w-6 h-6 text-[#7132f5] group-hover:text-white transition-colors duration-300" />
      </div>
      <h3 className="font-display font-semibold text-lg text-[#101114] mt-4 mb-2">{title}</h3>
      <p className="font-ui text-sm text-[#9497a9] leading-relaxed flex-grow">{desc}</p>
    </div>
  )

  return (
    <section className="bg-[#f8f8fa] py-24 px-6 md:px-12 lg:px-20">
      <div className="max-w-6xl mx-auto">
        <SectionTitle light="Como" bold="funciona" />

        {/* Desktop: flex com setas conectoras */}
        <div className="hidden md:flex items-stretch gap-3">
          {steps.map((step, i) => (
            <div key={step.n} className="flex items-center gap-3 flex-1">
              <div className="flex-1 self-stretch">
                <Card {...step} />
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="w-5 h-5 text-[#dedee5] flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Mobile: stack vertical */}
        <div className="md:hidden grid grid-cols-1 gap-4">
          {steps.map((step) => (
            <Card key={step.n} {...step} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

function Schedule() {
  return (
    <section id="cronograma" className="bg-white py-24 px-6 md:px-12 lg:px-20">
      <div className="max-w-6xl mx-auto">
        <SectionTitle light="Nosso" bold="cronograma" />
        <div className="max-w-2xl mx-auto">
          {SCHEDULE.map(({ time, label, desc, highlight }, i) => {
            const isFirst = i === 0
            const isLast  = i === SCHEDULE.length - 1
            return (
              <div key={time} className="group flex items-start gap-0">
                {/* Col 1 — horário */}
                <div className="w-20 flex-shrink-0 text-right pr-4 pt-0.5">
                  <span className="font-display font-semibold text-lg text-[#7132f5] tabular-nums leading-none">
                    {time}
                  </span>
                </div>

                {/* Col 2 — dot + linha */}
                <div className="relative flex flex-col items-center flex-shrink-0 w-5">
                  {/* Linha acima */}
                  {!isFirst && (
                    <div className="w-[2px] bg-[#dedee5] flex-none" style={{ height: '8px' }} />
                  )}
                  {/* Dot */}
                  <div className={[
                    'rounded-full bg-[#7132f5] z-10 flex-shrink-0 transition-all duration-200',
                    highlight
                      ? 'w-4 h-4 ring-4 ring-[#7132f5]/20'
                      : 'w-3 h-3 group-hover:w-4 group-hover:h-4 group-hover:ring-4 group-hover:ring-[#7132f5]/20',
                  ].join(' ')} />
                  {/* Linha abaixo */}
                  {!isLast && (
                    <div className="w-[2px] bg-[#dedee5] flex-grow min-h-[48px]" />
                  )}
                </div>

                {/* Col 3 — conteúdo */}
                <div className="flex-1 pl-4 pb-8">
                  <div
                    className="hover:bg-[#7132f5]/[0.02] rounded-lg px-3 py-2 -mx-3 transition-colors"
                  >
                    <p className={[
                      'font-display font-semibold text-base',
                      highlight ? 'text-[#7132f5]' : 'text-[#101114]',
                    ].join(' ')}>
                      {label}
                      {highlight && (
                        <span className="inline-block bg-[#7132f5]/10 text-[#7132f5] text-xs px-2 py-0.5 rounded-full ml-2 font-ui font-medium align-middle">
                          Encerramento
                        </span>
                      )}
                    </p>
                    <p className="font-ui text-sm text-[#9497a9] mt-1">{desc}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Rules ────────────────────────────────────────────────────────────────────

function Rules() {
  return (
    <section id="regras" className="bg-[#f8f8fa] py-24 px-6 md:px-12 lg:px-20">
      <div className="max-w-6xl mx-auto">
        <SectionTitle light="Regras" bold="do evento" />
        <div className="max-w-3xl mx-auto bg-white border border-[#dedee5] rounded-2xl overflow-hidden divide-y divide-[#dedee5]">
          {RULES.map(({ icon: Icon, text, warn }, i) => (
            <div
              key={text}
              className="flex items-center gap-4 px-6 py-4 hover:bg-[#7132f5]/[0.02] transition-colors"
            >
              {/* Número marca d'água */}
              <span className="font-display font-semibold text-2xl text-[#7132f5]/15 w-8 text-center flex-shrink-0 select-none">
                {String(i + 1).padStart(2, '0')}
              </span>
              {/* Ícone */}
              <div className={[
                'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                warn ? 'bg-red-50' : i % 2 === 0 ? 'bg-[#7132f5]/10' : 'bg-[#7132f5]/5',
              ].join(' ')}>
                <Icon className={`w-4 h-4 ${warn ? 'text-red-500' : 'text-[#7132f5]'}`} />
              </div>
              {/* Texto */}
              <p className="font-ui text-sm text-[#101114] leading-relaxed flex-1">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="bg-white py-24 px-6 md:px-12 lg:px-20">
      <div className="max-w-6xl mx-auto">
        <SectionTitle light="Perguntas" bold="frequentes" />
        <div className="max-w-2xl mx-auto border border-[#dedee5] rounded-2xl overflow-hidden">
          {FAQS.map((faq, i) => {
            const isOpen = open === i
            return (
              <div
                key={i}
                className={[
                  'transition-colors duration-200',
                  isOpen ? 'bg-[#7132f5]/[0.03] border-l-2 border-[#7132f5]' : 'border-l-2 border-transparent',
                  i > 0 && !isOpen && open !== i - 1 ? 'border-t border-[#dedee5]' : '',
                ].join(' ')}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className={`w-full flex items-center gap-4 px-5 py-5 text-left transition-colors ${!isOpen ? 'hover:bg-[#7132f5]/[0.02]' : ''}`}
                >
                  <span className="font-display text-lg text-[#7132f5]/15 w-8 flex-shrink-0 select-none">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={`flex-1 font-ui text-base pr-3 transition-colors ${isOpen ? 'font-semibold text-[#7132f5]' : 'font-medium text-[#101114]'}`}>
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#7132f5] flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Resposta com grid-rows animation */}
                <div
                  className="grid transition-all duration-200 ease-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <p className="font-ui text-sm text-[#686b82] leading-relaxed pl-12 pr-5 pb-5">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Final CTA ───────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section
      className="py-24 px-6 text-center"
      style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 40%, #7132f5 100%)' }}
    >
      <div className="max-w-2xl mx-auto relative">
        {/* Glow atrás do texto */}
        <div className="absolute inset-x-0 top-0 h-32 bg-[#7132f5]/20 blur-3xl rounded-full pointer-events-none" />
        <div className="relative">
          <h2 className="font-display leading-tight tracking-tight mb-4">
            <span className="block text-4xl md:text-5xl font-light text-white/70">Pronto para</span>
            <span className="block text-4xl md:text-5xl font-semibold text-white">o desafio?</span>
          </h2>
          <p className="font-ui font-light text-white/60 text-lg mb-10">
            {/* MOCK DATA */}
            As inscrições estão abertas. Monte sua equipe e participe.
          </p>
          <Link to="/register">
            <button className="h-14 px-10 text-lg font-ui font-semibold rounded-xl bg-white text-[#7132f5] hover:bg-white/90 transition-colors shadow-xl">
              Criar minha conta
            </button>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-[#101114] py-10 px-6 md:px-12 lg:px-20">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Liga de TI" className="h-6 brightness-0 invert" />
          <span className="font-ui text-sm text-white/40">© 2026 Liga de TI. Todos os direitos reservados.</span>
        </div>
        <div className="flex items-center gap-6 text-sm font-ui text-white/40">
          <a href="#" className="hover:text-[#7132f5] transition-colors">Termos</a>
          <a href="#" className="hover:text-[#7132f5] transition-colors">Privacidade</a>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#7132f5] hover:text-[#9170f0] transition-colors"
          >
            Não tem equipe? Entre no grupo →
          </a>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <>
      <style>{`html { scroll-behavior: smooth; }`}</style>
      <Hero />
      <InfoBar />
      <About />
      <HowItWorks />
      <Schedule />
      <Rules />
      <FAQ />
      <FinalCTA />
      <Footer />
    </>
  )
}

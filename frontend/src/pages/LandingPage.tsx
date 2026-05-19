import {
  ArrowRight,
  Briefcase,
  Calendar,
  ChevronDown,
  Clock,
  Code2,
  ExternalLink,
  MapPin,
  Network,
  Send,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'
import wehandleMark from '../assets/wehandle-mark.svg'
import { Button } from '../components/ui/Button'

const WHATSAPP_LINK = (import.meta as unknown as { env: Record<string, string> }).env.VITE_WHATSAPP_LINK || '#'
const EVENT_DATE = new Date('2026-06-13T10:00:00')

const SCHEDULE = [
  { time: '09:00', label: 'Recepção dos participantes', desc: 'Credenciamento e boas-vindas.' },
  { time: '10:00', label: 'Abertura e keynote', desc: 'Apresentação do desafio e das regras do dia.' },
  { time: '10:30', label: 'Início do desenvolvimento', desc: 'Mãos à obra: começa o coding.' },
  { time: '13:00', label: 'Almoço', desc: 'Pausa para recarregar as energias.' },
  { time: '14:00', label: 'Checkpoint com mentores', desc: 'Mentores disponíveis para feedback.' },
  { time: '17:00', label: 'Deadline de submissão', desc: 'Último momento para submeter o projeto.' },
  { time: '17:30', label: 'Apresentações para a banca', desc: '5 minutos por equipe.' },
  { time: '19:00', label: 'Premiação e encerramento', desc: 'Resultado final e networking.', highlight: true },
]

const FAQS = [
  {
    q: 'Quantas pessoas precisa ter na equipe?',
    a: 'Exatamente 4 pessoas: nem mais, nem menos.',
  },
  {
    q: 'Qual o prazo para formar e submeter a equipe?',
    a: 'Até 30/05/2026. Após essa data, equipes incompletas serão descartadas automaticamente.',
  },
  {
    q: 'Quantas equipes serão aprovadas?',
    a: 'No máximo 10 equipes. As equipes são aprovadas por ordem de submissão.',
  },
  {
    q: 'Posso participar de mais de uma equipe?',
    a: 'Não. Cada participante pode integrar apenas uma equipe.',
  },
  {
    q: 'Posso usar código pré-existente?',
    a: 'Não. O código deve ser desenvolvido inteiramente durante o hackathon. Projetos com código pré-existente serão desclassificados.',
  },
  {
    q: 'Preciso estar presente no dia do evento?',
    a: 'Sim. Todos os integrantes devem estar presentes no dia do evento, presencialmente.',
  },
  {
    q: 'Preciso saber programar para participar?',
    a: 'Sim. O hackathon é voltado para estudantes de tecnologia e áreas relacionadas. Recomendamos conhecimento básico em alguma linguagem de programação.',
  },
  {
    q: 'Posso participar sozinho?',
    a: 'Não. A participação acontece em equipes de exatamente 4 membros. Você pode montar sua equipe na plataforma ou entrar em uma equipe aberta.',
  },
  {
    q: 'Tem custo de inscrição?',
    a: 'Não. A participação no Hackathon Liga de TI é gratuita para estudantes inscritos.',
  },
  {
    q: 'Como funciona a avaliação?',
    a: 'Os projetos são avaliados por uma banca com critérios de inovação, usabilidade, qualidade técnica e apresentação.',
  },
]

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
    const id = window.setInterval(() => setTimeLeft(getTimeLeft(target)), 1000)
    return () => window.clearInterval(id)
  }, [target])

  return timeLeft
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function HeroDashboard() {
  const { days, hours, minutes, seconds } = useCountdown(EVENT_DATE)
  const countdown = [
    { value: days, label: 'dias' },
    { value: hours, label: 'hrs' },
    { value: minutes, label: 'min' },
    { value: seconds, label: 'seg' },
  ]

  return (
    <div className="floating-stage relative mx-auto min-h-[18rem] w-full max-w-[38rem] md:min-h-[26rem]">
      <div className="floating-depth-glow" />

      <div className="floating-panel floating-panel-liga absolute left-[13%] top-[12%] z-0 flex h-24 w-24 items-center justify-center rounded-[1.2rem] bg-white shadow-[0_38px_120px_rgba(168,135,255,0.3)] md:left-[8%] md:top-[6%] md:h-48 md:w-48 md:rounded-[1.45rem]">
        <img src={logo} alt="Liga de TI" className="h-[4.25rem] w-[4.75rem] object-contain md:h-[7.5rem] md:w-[8.5rem]" />
      </div>

      <div className="floating-panel floating-panel-wehandle absolute right-[13%] top-[12%] z-0 flex h-24 w-24 items-center justify-center rounded-[1.25rem] border border-white/10 bg-[#160a22] shadow-[0_40px_140px_rgba(236,92,168,0.28)] md:right-[8%] md:top-[0%] md:h-48 md:w-48 md:rounded-[1.55rem]">
        <img src={wehandleMark} alt="WeHandle" className="h-[4.25rem] w-[4.25rem] object-contain md:h-[7.5rem] md:w-[7.5rem]" />
      </div>

      <div className="floating-countdown absolute bottom-2 left-[9%] right-[9%] z-20 rounded-[1.2rem] border border-white/14 bg-[#0b0714]/80 p-2.5 shadow-[0_34px_100px_rgba(0,0,0,0.34)] backdrop-blur-2xl md:bottom-8 md:left-[12%] md:right-[12%] md:rounded-[1.45rem] md:p-4">
        <div className="mb-2 flex items-center justify-between md:mb-3">
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-white/48 md:text-[0.62rem] md:tracking-[0.2em]">13 junho 2026</span>
          <span className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-brand-soft md:px-3 md:text-[0.58rem] md:tracking-[0.16em]">contagem</span>
        </div>
        <div className="grid grid-cols-4 overflow-hidden rounded-[1.1rem] border border-white/10 bg-white/[0.04] text-center">
          {countdown.map(({ value, label }, index) => (
            <div key={label} className={['px-1 py-2 md:px-2 md:py-3', index > 0 ? 'border-l border-white/10' : ''].join(' ')}>
              <p className="font-display text-base font-semibold tabular-nums text-white md:text-3xl">{pad(value)}</p>
              <p className="mt-1 text-[0.48rem] uppercase tracking-[0.16em] text-white/40 md:text-[0.55rem] md:tracking-[0.18em]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="aeline-hero relative overflow-hidden bg-white p-2 pb-0 text-white md:p-3 md:pb-0">
      <div className="aeline-floating-canvas relative min-h-[calc(100svh-1rem)] overflow-hidden rounded-[1.45rem] md:min-h-[calc(100vh-1.5rem)] md:rounded-[1.75rem]">
        <div className="aeline-grid" />
        <div className="aeline-particles" />
        <nav className="relative z-30 mx-auto mt-5 flex h-12 w-[min(90vw,74rem)] items-center justify-between px-1 text-[0.66rem] uppercase tracking-[0.18em] text-white/58">
          <Link to="/" aria-label="Liga de TI" className="flex items-center gap-3">
            <img src={logo} alt="Liga de TI" className="h-7 brightness-0 invert" />
            <span className="hidden font-semibold text-white/78 sm:inline">Hackathons</span>
          </Link>
          <div className="hidden items-center gap-7 md:flex">
            <a href="#sobre" className="transition hover:text-white">Sobre</a>
            <a href="#cronograma" className="transition hover:text-white">Agenda</a>
            <a href="#faq" className="transition hover:text-white">Regras</a>
            <a href="#faq" className="transition hover:text-white">FAQ</a>
          </div>
          <Link to="/login" className="rounded-full border border-white/14 bg-white/[0.055] px-4 py-2 font-semibold text-white transition hover:bg-white/12 hover:text-white md:border-0 md:bg-white md:text-black md:hover:bg-black md:hover:text-white">
            Entrar
          </Link>
        </nav>

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-6.25rem)] w-[calc(100%-1.5rem)] flex-col justify-between md:min-h-[calc(100vh-8rem)] md:w-[min(94vw,88rem)]">
          <div className="grid flex-1 content-center gap-4 pb-3 pt-5 md:grid-cols-[0.98fr_1.02fr] md:items-center md:gap-5 md:pb-0 md:pt-3">
            <div className="mx-auto max-w-2xl text-center md:mx-0 md:max-w-6xl md:pt-4 md:text-left">
              <h1 className="font-display font-semibold leading-[0.92] tracking-[-0.075em]">
                <span className="block text-[clamp(1rem,4.8vw,1.25rem)] font-medium tracking-[0.12em] text-white/70 md:text-[clamp(1.2rem,2.2vw,2.2rem)]">Hackathon #01</span>
                <span className="mt-2 block font-clash text-[clamp(2.65rem,12.5vw,3.4rem)] font-extrabold text-white md:text-[clamp(3.4rem,6.5vw,7.4rem)]">Liga + WeHandle</span>
              </h1>
              <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-white/58 md:mx-0 md:mt-6 md:max-w-2xl md:text-lg md:leading-7">
                O primeiro Hackathon da Liga de TI, em parceria com a WeHandle, empresa brasileira que usa IA para transformar compliance e gestão de terceiros.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
                <Link to="/register">
                  <Button className="h-12 rounded-full bg-white px-7 text-sm font-semibold !text-black hover:bg-black hover:!text-white">
                    Participar do Hackathon
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <HeroDashboard />
          </div>

          <div className="relative z-20 mb-5 grid grid-cols-2 justify-items-center gap-x-4 gap-y-3 text-center text-white/70 md:flex md:flex-wrap md:items-center md:justify-center md:gap-x-6 md:gap-y-2 md:text-left">
            {[
              { icon: Calendar, text: '13 junho 2026' },
              { icon: Clock, text: '10h às 19h' },
              { icon: MapPin, text: 'Av. Alan Turing, 776' },
              { icon: Users, text: '10 times de 4 pessoas' },
            ].map(({ icon: Icon, text }, index) => (
              <div key={text} className="flex min-w-0 items-center justify-center gap-2 md:justify-start">
                <Icon className="h-3.5 w-3.5 text-white/40" />
                <span className="min-w-0 text-xs font-semibold leading-tight text-white/68 md:text-sm">{text}</span>
                {index < 3 && <span className="ml-3 hidden text-white/20 md:inline">|</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function BrandIcon({ name }: { name: string }) {
  if (name === 'Zapier') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M10.5 2h3v7.1l5-5 2.1 2.1-5 5H23v3h-7.4l5 5-2.1 2.1-5-5V22h-3v-7.7l-5.1 5.1-2.1-2.1 5.1-5.1H1v-3h7.3L3.2 4.1 5.3 2l5.2 5.2V2Z" fill="#FF4A00" />
      </svg>
    )
  }

  if (name === '1inch') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="#1B314F" d="M4 7.8 12 2l8 5.8v8.4L12 22l-8-5.8V7.8Z" />
        <path fill="#5CE1E6" d="M8 9.5 12.3 6l3.8 2.8-2.3 1.7 2.4 2.7-2.1 3.9-2.7-3-2.4 1.8-1-2.1 2.2-1.7-2.2-2.6Z" />
      </svg>
    )
  }

  if (name === 'Talkdesk') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" fill="#111827" />
        <path d="M7 8h10v3h-3.2v6h-3.6v-6H7V8Z" fill="#FFFFFF" />
      </svg>
    )
  }

  if (name === 'EasyTaxi') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#FFD233" />
        <path d="M6.2 13.4 8 8.6c.3-.9 1-1.4 2-1.4h4c1 0 1.7.5 2 1.4l1.8 4.8v4.1h-2.1v-1.4H8.3v1.4H6.2v-4.1Zm2.6-.7h6.4l-.9-2.6H9.7l-.9 2.6Z" fill="#111827" />
      </svg>
    )
  }

  if (name === 'GroupMe') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#00AFF0" />
        <path d="M7.2 9.6c0-1.7 1.4-3 3.2-3h3.2c1.8 0 3.2 1.3 3.2 3v1.9c0 1.7-1.4 3-3.2 3h-1.4l-2.8 2.4v-2.4h-1c-.7 0-1.2-.5-1.2-1.2V9.6Z" fill="#FFFFFF" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="currentColor" d="M12 2.2 15.4 4l3.8.5 1.8 3.4 1.2 3.6-1.2 3.6-1.8 3.4-3.8.5L12 21.8 8.6 20l-3.8-.5L3 16.1l-1.2-3.6L3 8.9l1.8-3.4 3.8-.5L12 2.2Zm0 3.1-2.5 1.4-2.8.4-1.3 2.5-.9 2.9.9 2.9 1.3 2.5 2.8.4 2.5 1.4 2.5-1.4 2.8-.4 1.3-2.5.9-2.9-.9-2.9-1.3-2.5-2.8-.4L12 5.3Z" />
    </svg>
  )
}

function IdeaStrip() {
  const Chip = ({ name }: { name: string }) => (
    <span className="mx-1.5 inline-flex translate-y-0.5 items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[clamp(0.7rem,0.9vw,0.9rem)] font-semibold tracking-[-0.035em] text-black shadow-[0_12px_34px_rgba(20,16,30,0.08)]">
      <BrandIcon name={name} />
      <span className="hidden sm:inline">{name}</span>
    </span>
  )

  return (
    <section className="bg-white px-5 py-10 text-black md:px-10 md:py-12">
      <div className="mx-auto max-w-7xl text-center">
        <h2 className="mx-auto max-w-5xl font-display text-[clamp(1.55rem,8vw,2.2rem)] font-semibold leading-[1.08] tracking-[-0.045em] md:text-[clamp(1.8rem,3.25vw,3.35rem)] md:tracking-[-0.06em]">
          Grandes empresas <Chip name="Zapier" /> começaram em um Hackathon
          <ArrowRight className="mx-3 inline h-[0.72em] w-[0.72em] translate-y-1 text-brand" />
          está esperando <Chip name="1inch" /> o quê?
        </h2>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Chip name="Talkdesk" />
          <Chip name="EasyTaxi" />
          <Chip name="GroupMe" />
        </div>
        <Link to="/register">
          <Button className="mt-7 h-12 rounded-full bg-black px-7 text-xs font-semibold text-white shadow-[0_18px_48px_rgba(113,50,245,0.22)] hover:bg-brand">
            Participar do Hackathon
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  )
}

function About() {
  const benefits = [
    {
      icon: Network,
      title: 'Networking vivo',
      desc: 'Conecte-se com devs, designers, mentores e empresas da região.',
      image: 'https://images.pexels.com/photos/5965527/pexels-photo-5965527.jpeg?auto=compress&cs=tinysrgb&w=1200',
      imageAlt: 'Universitários colaborando com notebook no campus',
    },
    {
      icon: Briefcase,
      title: 'Experiência real',
      desc: 'Pratique resolução de problemas, trabalho em equipe e entrega de produto.',
      image: 'https://images.pexels.com/photos/10498787/pexels-photo-10498787.jpeg?auto=compress&cs=tinysrgb&w=1200',
      imageAlt: 'Estudantes trabalhando em equipe com laptops e documentos',
    },
    {
      icon: Trophy,
      title: 'Premiação',
      desc: 'Reconhecimento e visibilidade para as melhores soluções criadas no evento.',
      image: 'https://images.pexels.com/photos/6805146/pexels-photo-6805146.jpeg?auto=compress&cs=tinysrgb&w=1200',
      imageAlt: 'Equipe de tecnologia comemorando prêmio de competição',
    },
  ]

  return (
    <section id="sobre" className="bg-[#f2f2f2] px-5 py-14 text-black md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <h2 className="font-display text-[clamp(1.55rem,8vw,2.2rem)] font-semibold leading-[1.08] tracking-[-0.045em] md:text-[clamp(1.8rem,3.25vw,3.35rem)] md:tracking-[-0.06em]">
            Por que participar?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-black/48">
          </p>
        </div>
        <div className="group/benefits grid gap-3 rounded-[1.35rem] bg-[#eeeeee] p-3 md:flex md:rounded-[1.8rem]">
          {benefits.map(({ icon: Icon, title, desc, image, imageAlt }, index) => (
            <article key={title} className={['group/card relative min-h-[13.5rem] min-w-0 overflow-hidden rounded-[1.1rem] border border-black/10 bg-white shadow-[0_18px_45px_rgba(20,16,30,0.04)] transition-all duration-500 hover:z-10 md:min-h-[16rem] md:rounded-[1.2rem] md:flex-1 md:hover:scale-[1.015] md:hover:shadow-[0_28px_80px_rgba(20,16,30,0.16)] md:hover:flex-[2]', index === 0 ? 'md:flex-[2] group-hover/benefits:md:flex-1 hover:md:flex-[2]' : ''].join(' ')}>
              <div className={['absolute bottom-4 right-4 top-4 w-[42%] overflow-hidden rounded-[0.9rem] opacity-100 transition-all duration-500 ease-out md:bottom-5 md:right-5 md:top-5 md:rounded-[1rem]', index === 0 ? 'md:w-[42%] md:opacity-100 group-hover/benefits:md:w-0 group-hover/benefits:md:opacity-0 group-hover/card:md:w-[42%] group-hover/card:md:opacity-100' : 'md:w-0 md:opacity-0 group-hover/card:md:w-[42%] group-hover/card:md:opacity-100'].join(' ')}>
                <img src={image} alt={imageAlt} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
              </div>
              <div className={['relative z-10 flex min-h-[13.5rem] max-w-[56%] flex-col p-5 transition-all duration-500 md:min-h-[16rem]', index === 0 ? 'md:max-w-[56%] group-hover/benefits:md:max-w-full group-hover/card:md:max-w-[56%]' : 'md:max-w-full group-hover/card:md:max-w-[56%]'].join(' ')}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-black/40">0{index + 1}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition duration-300 group-hover/card:bg-brand group-hover/card:text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-auto max-w-xs transition duration-500">
                  <h3 className="text-lg font-semibold tracking-[-0.04em] text-black md:text-xl md:tracking-[-0.05em]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/50">{desc}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '01', icon: UserPlus, title: 'Crie sua conta', desc: 'Cadastre-se e deixe seu perfil pronto para formar equipe.' },
    { n: '02', icon: Users, title: 'Monte sua equipe', desc: 'Convide membros ou entre em uma equipe com vagas abertas.' },
    { n: '03', icon: Send, title: 'Submeta no prazo', desc: 'Com os 4 integrantes confirmados, submeta até 30/05/2026.' },
    { n: '04', icon: Code2, title: 'Participe do hackathon', desc: 'Compareça no dia 13/06, desenvolva sua solução e apresente para a banca.' },
  ]

  return (
    <section className="bg-white px-5 py-14 text-black md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <h2 className="font-display text-[clamp(1.55rem,8vw,2.2rem)] font-semibold leading-[1.08] tracking-[-0.045em] md:text-[clamp(1.8rem,3.25vw,3.35rem)] md:tracking-[-0.06em]">
            Como funciona a Plataforma?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-black/48">
            Uma plataforma exclusiva da Liga para facilitar a formação de equipes, submissões e toda a experiência do hackathon.
          </p>
        </div>
        <div className="grid gap-3 rounded-[1.8rem] bg-[#eeeeee] p-3 md:grid-cols-4">
          {steps.map(({ n, icon: Icon, title, desc }) => (
            <article key={n} className="group min-h-[13.5rem] rounded-[1.1rem] border border-black/8 bg-white p-5 shadow-[0_18px_45px_rgba(20,16,30,0.04)] transition duration-300 md:min-h-[16rem] md:rounded-[1.2rem] md:hover:z-10 md:hover:scale-[1.045] md:hover:shadow-[0_26px_70px_rgba(20,16,30,0.12)]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-black/34">{n}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition duration-300 group-hover:bg-brand group-hover:text-white">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <h3 className="mt-10 text-lg font-semibold tracking-[-0.04em] md:mt-14 md:text-xl md:tracking-[-0.05em]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-black/48">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Schedule() {
  return (
    <section id="cronograma" className="bg-[#f2f2f2] px-5 py-14 text-black md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <h2 className="font-display text-[clamp(1.55rem,8vw,2.2rem)] font-semibold leading-[1.08] tracking-[-0.045em] md:text-[clamp(1.8rem,3.25vw,3.35rem)] md:tracking-[-0.06em]">
            Local e Cronograma
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-black/48">
          </p>
        </div>
        <div className="grid gap-3 overflow-hidden rounded-[1.8rem] bg-[#eeeeee] p-3 md:grid-cols-2">
          <div className="rounded-[1.15rem] border border-black/10 bg-white p-4 shadow-[0_18px_45px_rgba(20,16,30,0.04)] md:col-span-2">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-brand/60">Local do evento</p>
                <h3 className="mt-1 text-sm font-semibold tracking-[-0.03em] text-black md:text-base">WeHandle</h3>
                <p className="mt-1 text-xs leading-5 text-black/50 md:text-sm">Av. Alan Turing, 776 - Campinas/SP</p>
              </div>
            </div>
          </div>
          {SCHEDULE.map(({ time, label, desc, highlight }, index) => (
            <article
              key={time}
              className={[
                'group relative overflow-hidden rounded-[1.15rem] border p-4 shadow-[0_18px_45px_rgba(20,16,30,0.04)] transition duration-300',
                highlight
                  ? 'border-black bg-black text-white'
                  : 'border-black/10 bg-white hover:-translate-y-1 hover:border-black/16',
              ].join(' ')}
            >
              {highlight && <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand/10 blur-2xl transition duration-300" />}
              <div className="relative flex items-start gap-4">
                <div className={['flex h-14 w-20 shrink-0 items-center justify-center rounded-2xl font-display text-xl font-semibold tabular-nums transition duration-300', highlight ? 'bg-white text-black' : 'bg-white text-brand group-hover:text-black'].join(' ')}>
                  {time}
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className={['text-[0.62rem] font-semibold uppercase tracking-[0.16em] transition duration-300', highlight ? 'text-brand-soft' : 'text-brand/60'].join(' ')}>
                      etapa {String(index + 1).padStart(2, '0')}
                    </span>
                    {highlight && <span className="rounded-full bg-brand px-2 py-0.5 text-[0.6rem] font-semibold text-white">Encerramento</span>}
                  </div>
                  <h3 className={['text-sm font-semibold tracking-[-0.03em] md:text-base', highlight ? 'text-white' : 'text-black'].join(' ')}>{label}</h3>
                  <p className={['mt-1 text-xs md:text-sm', highlight ? 'text-white/50' : 'text-black/50'].join(' ')}>{desc}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="bg-white px-5 py-14 text-black md:px-10">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-8 text-center font-display text-[clamp(1.55rem,8vw,2.2rem)] font-semibold leading-[1.08] tracking-[-0.045em] md:text-[clamp(1.8rem,3.25vw,3.35rem)] md:tracking-[-0.06em]">
          Regras e FAQ
        </h2>
        <div className="overflow-hidden rounded-2xl border border-black/8 bg-[#f8f8f8] shadow-[0_18px_50px_rgba(20,16,30,0.05)]">
          {FAQS.map(({ q, a }, index) => {
            const isOpen = open === index
            return (
              <div key={q} className={index > 0 ? 'border-t border-black/8' : ''}>
                <button className="flex w-full items-center gap-3 px-4 py-4 text-left md:gap-4 md:px-6" onClick={() => setOpen(isOpen ? null : index)}>
                  <span className="text-xs text-brand/32">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex-1 text-sm font-semibold tracking-[-0.02em] text-black">{q}</span>
                  <ChevronDown className={['h-4 w-4 text-brand transition-transform', isOpen ? 'rotate-180' : ''].join(' ')} />
                </button>
                <div className="grid transition-all" style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
                  <div className="overflow-hidden">
                    <p className="px-4 pb-4 text-sm leading-7 text-black/48 md:px-14">{a}</p>
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

function Partner() {
  return (
    <section className="bg-[#f2f2f2] px-5 py-14 text-black md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="grid items-center gap-6 rounded-2xl border border-black/8 bg-white p-5 shadow-[0_18px_50px_rgba(20,16,30,0.05)] md:grid-cols-[auto_1fr] md:gap-8 md:p-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-black/6 bg-[#160a22] shadow-[0_14px_40px_rgba(113,50,245,0.12)]">
            <img src={wehandleMark} alt="WeHandle" className="h-12 w-12 object-contain" />
          </div>
          <div>
            <p className="text-[0.62rem] font-medium uppercase tracking-[0.18em] text-brand/60">Empresa parceira</p>
            <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.04em]">WeHandle</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-black/54">
              Startup brasileira que usa Inteligência Artificial para transformar a gestão de terceiros e compliance.
              Atende clientes como Rede Globo, Klabin e Unilever, e agora abre suas portas em Campinas para o primeiro hackathon da Liga de TI.
            </p>
            <a href="https://wehandle.com.br/" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:text-brand-soft">
              Conheça a WeHandle
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

void Partner

function FinalCTA() {
  return (
    <section className="bg-white px-5 py-20 text-white md:px-10">
      <div className="purple-cta mx-auto grid max-w-7xl gap-5 overflow-hidden rounded-[1.35rem] p-5 md:grid-cols-[1.08fr_0.92fr] md:items-stretch md:gap-6 md:rounded-[2rem] md:p-6">
        <div className="flex flex-col justify-between md:p-4">
          <div>
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-white/42">Inscrições abertas</p>
          <h2 className="mt-4 max-w-4xl font-display text-[clamp(1.55rem,8vw,2.2rem)] font-semibold leading-[1.08] tracking-[-0.045em] md:text-[clamp(1.8rem,3.25vw,3.35rem)] md:tracking-[-0.06em]">
            Pronto para montar sua equipe?
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/58 md:mt-6 md:text-lg md:leading-8">
            Inscreva-se, chame seu time e garanta a submissão dentro do prazo.
          </p>
          </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row md:flex-wrap">
          <Link to="/register">
            <Button className="h-12 w-full rounded-full bg-black px-7 text-white hover:bg-brand sm:w-auto">Participar do Hackathon</Button>
          </Link>
          {WHATSAPP_LINK !== '#' && (
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer">
              <Button variant="outlined" className="h-12 w-full rounded-full border-white/18 bg-white/[0.06] px-7 text-white hover:bg-white/10 hover:text-white sm:w-auto">
                Grupo WhatsApp
              </Button>
            </a>
          )}
        </div>
        </div>
        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.07] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.16)] backdrop-blur-xl md:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#160a22] shadow-[0_14px_40px_rgba(113,50,245,0.18)]">
              <img src={wehandleMark} alt="WeHandle" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <p className="text-[0.62rem] font-medium uppercase tracking-[0.18em] text-brand-soft">Empresa parceira</p>
              <h3 className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.04em] text-white">WeHandle</h3>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-white/58">
            Startup brasileira que usa Inteligência Artificial para transformar a gestão de terceiros e compliance.
            Atende clientes como Rede Globo, Klabin e Unilever, e agora abre suas portas em Campinas para o primeiro hackathon da Liga de TI.
          </p>
          <a href="https://wehandle.com.br/" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-soft transition hover:text-white">
            Conheça a WeHandle
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-white p-2 pt-0 text-white md:p-3 md:pt-0">
      <div className="overflow-hidden rounded-[1.45rem] bg-[#111111] px-5 py-12 shadow-[0_26px_90px_rgba(0,0,0,0.24)] md:rounded-[1.75rem] md:px-10 md:py-14">
        <div className="mx-auto w-full max-w-[88rem]">
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 py-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] md:gap-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Liga de TI" className="h-7 brightness-0 invert" />
                <span className="font-semibold">Hackathons</span>
              </div>
              <p className="mt-6 max-w-sm text-sm leading-7 text-white/46">
                Plataforma oficial para formar equipes, gerenciar convites e acompanhar o fluxo de submissão do evento com nossos parceiros.
              </p>
            </div>
            {[
              ['Evento', ['Sobre', 'Cronograma', 'Regras e FAQ']],
              ['Plataforma', ['Entrar', 'Cadastrar', 'Equipes', 'Admin']],
            ].map(([title, items]) => (
              <div key={title as string}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/36">{title}</h3>
                <div className="mt-5 flex flex-col gap-3 text-sm text-white/54">
                  {(items as string[]).map((item) => (
                    <Link key={item} to={item === 'Admin' ? '/admin/login' : item === 'Entrar' ? '/login' : item === 'Cadastrar' ? '/register' : item === 'Equipes' ? '/teams' : item === 'Regras e FAQ' ? '#faq' : `#${item.toLowerCase()}`} className="hover:text-white">
                      {item}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/36">Detalhes deste hackathon</h3>
              <div className="mt-5 space-y-4 text-sm text-white/54">
                <p>13 de junho de 2026</p>
                <p>10h às 19h</p>
                <p>Av. Alan Turing, 776 - WeHandle, Campinas/SP</p>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-5 border-t border-white/10 pt-8 text-xs text-white/32 md:flex-row md:items-center md:justify-between">
            <p>2026, Liga de TI - PUC Campinas. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function LandingPage() {
  return (
    <>
      <Hero />
      <IdeaStrip />
      <About />
      <HowItWorks />
      <Schedule />
      <FAQ />
      <FinalCTA />
      <Footer />
    </>
  )
}

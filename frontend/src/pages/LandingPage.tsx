import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  ChevronDown,
  FileText,
  LogIn,
  MessagesSquare,
  Mic,
  Network,
  Repeat,
  Rocket,
  ShieldCheck,
  Target,
  Telescope,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'
import { WhatsAppIcon } from '../components/ui/WhatsAppIcon'
import { WHATSAPP_LINK } from '../links'
import { Button } from '../components/ui/Button'
import { useOpenProcess } from '../hooks/useOpenProcess'


const STAGES = [
  {
    n: '01',
    icon: FileText,
    name: 'Resolução do Case',
    summary:
      'Os candidatos receberão um desafio e deverão desenvolver uma proposta de solução. O prazo, o formato de entrega e as demais orientações serão comunicados antes do início da etapa.',
    observes: [
      'Compreensão do problema',
      'Pensamento crítico',
      'Qualidade da solução',
      'Viabilidade',
      'Justificativa das decisões',
      'Estrutura e clareza',
      'Criatividade e iniciativa',
    ],
  },
  {
    n: '02',
    icon: Mic,
    name: 'Pitch',
    summary:
      'Os candidatos poderão apresentar e defender a solução desenvolvida no case. O formato, a duração e as orientações dessa etapa serão informados com antecedência.',
    observes: [
      'Clareza da comunicação',
      'Capacidade de síntese',
      'Argumentação',
      'Domínio da solução',
      'Resposta às perguntas',
      'Organização da apresentação',
    ],
  },
  {
    n: '03',
    icon: MessagesSquare,
    name: 'Entrevista',
    duration: 'Individual e estruturada',
    summary:
      'Uma conversa para conhecermos melhor o perfil, as motivações e as experiências de cada candidato, além de esclarecer dúvidas sobre a Liga e sua forma de atuação.',
    observes: [
      'Motivação',
      'Comprometimento',
      'Trabalho em equipe',
      'Iniciativa',
      'Capacidade de aprendizado',
      'Alinhamento com o propósito da Liga',
    ],
  },
]

/** Os cinco valores do Manual de Onboarding da Liga, seção 1.4. */
const VALUES = [
  {
    icon: Zap,
    title: 'Protagonismo',
    desc: 'Você não espera ser convocado. Enxerga o problema e resolve. Aqui, a iniciativa é obrigatória.',
  },
  {
    icon: Target,
    title: 'Execução',
    desc: 'Ideia sem entrega é devaneio. Vale quem transforma plano em resultado concreto.',
  },
  {
    icon: BadgeCheck,
    title: 'Profissionalismo',
    desc: 'Pontualidade, comunicação clara, prazos cumpridos e postura adequada em todo contexto.',
  },
  {
    icon: Users,
    title: 'Colaboração',
    desc: 'Crescemos juntos. Dividimos conhecimento, ajudamos os colegas e celebramos as vitórias do time.',
  },
  {
    icon: Repeat,
    title: 'Constância',
    desc: 'Presença regular e entregas consistentes valem mais que picos de energia seguidos de sumiço.',
  },
]

const FAQS = [
  {
    q: 'Preciso saber programar para participar?',
    a: 'Não. O case não exige código nem conhecimento específico de programação. A proposta permite que estudantes de diferentes semestres e áreas relacionadas à tecnologia participem em condições semelhantes. O que avaliamos é como você interpreta o problema, decide e justifica suas escolhas.',
  },
  {
    q: 'A candidatura é individual?',
    a: 'Sim. Cada pessoa faz sua própria inscrição, entrega seu case, apresenta seu pitch e passa pela entrevista.',
  },
  {
    q: 'Posso usar Inteligência Artificial no case?',
    a: 'Pode, como ferramenta de apoio: pesquisa, brainstorming, revisão e organização. Você continua responsável pelo conteúdo entregue e precisa conseguir explicar sua proposta, justificar suas escolhas e responder perguntas. Quem não defende o que entregou perde pontos em Domínio da Solução no pitch.',
  },
  {
    q: 'Quanto tempo dura o processo?',
    a: 'O cronograma está sendo definido. As datas, os prazos e as orientações de cada etapa serão comunicados com antecedência pelos canais oficiais da Liga e pela plataforma.',
  },
  {
    q: 'Onde acompanho minha candidatura?',
    a: 'Nesta mesma plataforma. Você acompanha em que etapa está, envia o que for pedido dentro do prazo e recebe um aviso por e-mail a cada mudança.',
  },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatLongDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/** Período de inscrições no hero. Some enquanto o processo não está publicado. */
function RegistrationWindow() {
  const { data } = useOpenProcess()
  if (!data) return null

  return (
    <div className="mt-6 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 backdrop-blur-xl">
      <CalendarDays className="h-4 w-4 shrink-0 text-brand-soft" />
      <span className="text-xs font-semibold text-white/80 md:text-sm">
        Inscrições de {formatDate(data.registration_start)} a {formatDate(data.registration_end)}
      </span>
      <span
        className={[
          'rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em]',
          data.registration_open ? 'bg-brand-green/20 text-brand-green' : 'bg-white/10 text-white/50',
        ].join(' ')}
      >
        {data.registration_open ? 'abertas' : 'encerradas'}
      </span>
    </div>
  )
}

/** Navbar e hero compartilham a mesma largura e o mesmo padding lateral,
 *  senão a borda esquerda do texto não bate com a do logo da nav. */
const HERO_CONTAINER = 'mx-auto w-[min(90vw,74rem)] px-1'

function HeroPanel() {
  return (
    <div className="floating-stage relative mx-auto flex min-h-[14rem] w-full max-w-[38rem] items-center justify-center md:mr-0 md:min-h-[26rem] md:justify-end">
      <div className="floating-panel floating-panel-liga flex h-32 w-32 items-center justify-center rounded-[1.4rem] bg-white shadow-[0_38px_120px_rgba(168,135,255,0.3)] md:h-56 md:w-56 md:rounded-[1.9rem]">
        <img src={logo} alt="Liga de TI" className="h-[5.75rem] w-[6.5rem] object-contain md:h-[9.5rem] md:w-[10.5rem]" />
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
        <nav className={`${HERO_CONTAINER} relative z-30 mt-5 flex h-12 items-center justify-between text-[0.66rem] uppercase tracking-[0.18em] text-white/58`}>
          <Link to="/" aria-label="Liga de TI" className="flex items-center gap-3">
            <img src={logo} alt="Liga de TI" className="h-7 brightness-0 invert" />
            <span className="hidden font-semibold text-white/78 sm:inline">Processo Seletivo</span>
          </Link>
          <div className="hidden items-center gap-7 md:flex">
            <a href="#liga" className="transition hover:text-white">A Liga</a>
            <a href="#processo" className="transition hover:text-white">O processo</a>
            <a href="#etapas" className="transition hover:text-white">Etapas</a>
            <a href="#faq" className="transition hover:text-white">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            {/* A frase inteira só a partir de lg. Abaixo disso o cabeçalho
                tem o logo, quatro âncoras e o "Entrar" na mesma linha, e ela
                estouraria. Fica o ícone, com o nome para leitor de tela. */}
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#149e61] px-3 py-2 font-semibold text-white transition hover:bg-[#108150] lg:px-4"
            >
              <WhatsAppIcon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Acesse o grupo da Liga</span>
              <span className="sr-only lg:hidden">Acesse o grupo da Liga</span>
            </a>
            <a href="#acesso" className="rounded-full border border-white/15 bg-white/[0.055] px-4 py-2 font-semibold text-white transition hover:bg-white/10 hover:text-white md:border-0 md:bg-white md:text-black md:hover:bg-black md:hover:text-white">
              Entrar
            </a>
          </div>
        </nav>

        <div className={`${HERO_CONTAINER} relative z-10 flex min-h-[calc(100svh-6.25rem)] flex-col justify-between md:min-h-[calc(100vh-8rem)]`}>
          <div className="grid flex-1 content-center gap-4 pb-3 pt-5 md:grid-cols-[0.98fr_1.02fr] md:items-center md:gap-5 md:pb-0 md:pt-3">
            <div className="mx-auto max-w-2xl text-center md:mx-0 md:max-w-6xl md:pt-4 md:text-left">
              <h1 className="font-display font-semibold leading-[0.92] tracking-[-0.075em]">
                <span className="block text-[clamp(1rem,4.8vw,1.25rem)] font-medium tracking-[0.12em] text-white/70 md:text-[clamp(1.2rem,2.2vw,2.2rem)]">
                  Processo Seletivo 2026.2
                </span>
                <span className="mt-2 block font-clash text-[clamp(2.65rem,12.5vw,3.4rem)] font-extrabold text-white md:text-[clamp(3.4rem,6.5vw,7.4rem)]">
                  Liga de TI
                </span>
              </h1>
              <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-white/58 md:mx-0 md:mt-6 md:max-w-2xl md:text-lg md:leading-7">
                Não buscamos quem já sabe mais, e sim quem tem mais potencial para aprender, contribuir e permanecer.
                Três etapas para mostrar como você pensa, comunica e se compromete.
              </p>
              <RegistrationWindow />
              <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
                <Link to="/register">
                  <Button className="h-12 rounded-full bg-white px-7 text-sm font-semibold !text-black hover:bg-black hover:!text-white">
                    Quero me candidatar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#processo">
                  <Button
                    variant="outlined"
                    className="h-12 rounded-full border-white/20 bg-white/[0.06] px-7 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
                  >
                    Como funciona
                  </Button>
                </a>
              </div>
            </div>
            <HeroPanel />
          </div>
        </div>
      </div>
    </section>
  )
}

function ValuesStrip() {
  return (
    <section className="bg-white px-5 py-10 text-black md:px-10 md:py-12">
      <div className="mx-auto max-w-7xl text-center">
        <h2 className="mx-auto max-w-5xl font-display text-[clamp(1.55rem,8vw,2.2rem)] font-semibold leading-[1.08] tracking-[-0.045em] md:text-[clamp(1.8rem,3.25vw,3.35rem)] md:tracking-[-0.06em]">
          Procuramos <span className="text-brand">protagonismo</span> e{' '}
          <span className="text-brand">execução</span>
          <ArrowRight className="mx-3 inline h-[0.72em] w-[0.72em] translate-y-1 text-brand" />
          mais do que currículo pronto
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-black/48">
          Comprometimento, responsabilidade com prazos, iniciativa, trabalho em equipe, comunicação,
          pensamento crítico e vontade de aprender. É isso que as três etapas medem.
        </p>
      </div>
    </section>
  )
}

function AboutLiga() {
  const benefits = [
    {
      icon: Rocket,
      title: 'Projetos práticos',
      desc: 'Experiências que simulam o ambiente profissional real, não exercícios de sala de aula.',
      image: 'https://images.pexels.com/photos/3184306/pexels-photo-3184306.jpeg?auto=compress&cs=tinysrgb&w=1200',
      imageAlt: 'Equipe reunida trabalhando em um projeto com notebooks',
    },
    {
      icon: Mic,
      title: 'Eventos e PapoTech',
      desc: 'Encontros com fundadores, lideranças e especialistas do mercado de tecnologia.',
      image: 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=1200',
      imageAlt: 'Palestrante apresentando para uma plateia em evento de tecnologia',
    },
    {
      icon: Network,
      title: 'Rede de contatos',
      desc: 'Uma rede qualificada dentro e fora da universidade, construída junto com quem também executa.',
      image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200',
      imageAlt: 'Pessoas conversando e trocando contatos em ambiente profissional',
    },
    {
      icon: Briefcase,
      title: 'Uma área para atuar',
      desc: 'Financeiro, Marketing, Eventos ou Operações e Parcerias, com responsabilidades reais na sua.',
      image: 'https://images.pexels.com/photos/10498787/pexels-photo-10498787.jpeg?auto=compress&cs=tinysrgb&w=1200',
      imageAlt: 'Estudantes trabalhando juntos com laptops e documentos',
    },
  ]

  return (
    <section id="liga" className="bg-[#f2f2f2] px-5 py-14 text-black md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-brand/60">Sobre a Liga</p>
          <h2 className="mt-2 font-display text-[clamp(1.55rem,8vw,2.2rem)] font-semibold leading-[1.08] tracking-[-0.045em] md:text-[clamp(1.8rem,3.25vw,3.35rem)] md:tracking-[-0.06em]">
            Por que a Liga existe
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-black/48">
            Em março de 2024, um grupo de estudantes da PUC-Campinas percebeu algo que incomodava: havia
            cursos técnicos, aulas teóricas e muita vontade de aprender, mas nenhum espaço dentro da
            universidade que conectasse os alunos ao mercado de forma prática e estruturada. A Liga nasceu
            para preencher essa lacuna. Não para ficar bonita no currículo, mas para mudar a trajetória de
            quem participa dela.
          </p>
        </div>

        <div className="mb-3 grid gap-3 rounded-[1.35rem] bg-[#eeeeee] p-3 md:grid-cols-2 md:rounded-[1.8rem]">
          <article className="rounded-[1.1rem] border border-black/10 bg-white p-6 shadow-[0_18px_45px_rgba(20,16,30,0.04)] md:rounded-[1.2rem] md:p-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Target className="h-4 w-4" />
            </div>
            <h3 className="mt-4 text-lg font-semibold tracking-[-0.04em] text-black md:text-xl">Missão</h3>
            <p className="mt-2 text-sm leading-7 text-black/55">
              Preencher a lacuna entre a formação acadêmica e o mercado, oferecendo aos estudantes de
              tecnologia da PUC-Campinas experiências práticas, conexões reais e um ambiente de alto
              desempenho para se desenvolverem como profissionais.
            </p>
          </article>

          <article className="rounded-[1.1rem] border border-black/10 bg-[#111111] p-6 text-white shadow-[0_18px_45px_rgba(20,16,30,0.1)] md:rounded-[1.2rem] md:p-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-brand-soft">
              <Telescope className="h-4 w-4" />
            </div>
            <h3 className="mt-4 text-lg font-semibold tracking-[-0.04em] md:text-xl">
              Visão <span className="text-sm font-normal text-white/40">(3 anos)</span>
            </h3>
            <p className="mt-2 text-sm leading-7 text-white/58">
              Ser a principal referência em tecnologia e empreendedorismo da PUC-Campinas, reconhecida por
              empresas, professores e alunos como o centro de excelência e inovação da universidade.
            </p>
          </article>
        </div>

        <h3 className="mb-4 mt-10 text-center font-display text-xl font-semibold tracking-[-0.04em] text-black md:text-2xl">
          O que você ganha ao entrar
        </h3>
        <div className="group/benefits grid gap-3 rounded-[1.35rem] bg-[#eeeeee] p-3 md:flex md:rounded-[1.8rem]">
          {benefits.map(({ icon: Icon, title, desc, image, imageAlt }, index) => (
            <article
              key={title}
              className={[
                'group/card relative min-h-[13.5rem] min-w-0 overflow-hidden rounded-[1.1rem] border border-black/10 bg-white shadow-[0_18px_45px_rgba(20,16,30,0.04)] transition-all duration-500 hover:z-10 md:min-h-[16rem] md:rounded-[1.2rem] md:flex-1 md:hover:scale-[1.015] md:hover:shadow-[0_28px_80px_rgba(20,16,30,0.16)] md:hover:flex-[2]',
                index === 0 ? 'md:flex-[2] group-hover/benefits:md:flex-1 hover:md:flex-[2]' : '',
              ].join(' ')}
            >
              <div
                className={[
                  'absolute bottom-4 right-4 top-4 w-[42%] overflow-hidden rounded-[0.9rem] opacity-100 transition-all duration-500 ease-out md:bottom-5 md:right-5 md:top-5 md:rounded-[1rem]',
                  index === 0
                    ? 'md:w-[42%] md:opacity-100 group-hover/benefits:md:w-0 group-hover/benefits:md:opacity-0 group-hover/card:md:w-[42%] group-hover/card:md:opacity-100'
                    : 'md:w-0 md:opacity-0 group-hover/card:md:w-[42%] group-hover/card:md:opacity-100',
                ].join(' ')}
              >
                <img src={image} alt={imageAlt} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
              </div>
              <div
                className={[
                  'relative z-10 flex min-h-[13.5rem] max-w-[56%] flex-col p-5 transition-all duration-500 md:min-h-[16rem]',
                  index === 0 ? 'md:max-w-[56%] group-hover/benefits:md:max-w-full group-hover/card:md:max-w-[56%]' : 'md:max-w-full group-hover/card:md:max-w-[56%]',
                ].join(' ')}
              >
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

        <h3 className="mb-1 mt-12 text-center font-display text-xl font-semibold tracking-[-0.04em] text-black md:text-2xl">
          Nossos valores
        </h3>
        <p className="mx-auto mb-4 max-w-xl text-center text-sm leading-6 text-black/48">
          Não são decorativos. Definem quem somos, como trabalhamos e como nos cobramos mutuamente.
        </p>
        <div className="grid gap-3 rounded-[1.35rem] bg-[#eeeeee] p-3 sm:grid-cols-2 md:grid-cols-5 md:rounded-[1.8rem]">
          {VALUES.map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              className="group rounded-[1.1rem] border border-black/10 bg-white p-5 shadow-[0_18px_45px_rgba(20,16,30,0.04)] transition duration-300 md:rounded-[1.2rem] md:hover:-translate-y-1 md:hover:shadow-[0_26px_70px_rgba(20,16,30,0.12)]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand transition duration-300 group-hover:bg-brand group-hover:text-white">
                <Icon className="h-4 w-4" />
              </div>
              <h4 className="mt-4 text-base font-semibold tracking-[-0.03em] text-black">{title}</h4>
              <p className="mt-2 text-sm leading-6 text-black/50">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '01', icon: UserPlus, title: 'Inscrição', desc: 'Crie sua conta, preencha seu perfil e acompanhe tudo por aqui.' },
    { n: '02', icon: FileText, title: 'Case', desc: 'Receba o desafio, desenvolva sua proposta e envie a solução conforme as orientações divulgadas.' },
    { n: '03', icon: Mic, title: 'Pitch', desc: 'Apresente sua proposta e converse com a equipe sobre as decisões tomadas durante a resolução.' },
    { n: '04', icon: MessagesSquare, title: 'Entrevista', desc: 'Participe de uma conversa para conhecermos melhor seu perfil, suas motivações e seu interesse pela Liga.' },
  ]

  return (
    <section id="processo" className="bg-white px-5 py-14 text-black md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-brand/60">Cerca de 4 semanas</p>
          <h2 className="mt-2 font-display text-[clamp(1.55rem,8vw,2.2rem)] font-semibold leading-[1.08] tracking-[-0.045em] md:text-[clamp(1.8rem,3.25vw,3.35rem)] md:tracking-[-0.06em]">
            Como funciona o processo
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-black/48">
            Cada etapa avalia coisas diferentes, para que nenhuma habilidade isolada decida o resultado.
            Tudo acontece nesta plataforma: entrega, acompanhamento e comunicação.
          </p>
        </div>
        <div className="grid gap-3 rounded-[1.8rem] bg-[#eeeeee] p-3 md:grid-cols-4">
          {steps.map(({ n, icon: Icon, title, desc }) => (
            <article
              key={n}
              className="group min-h-[13.5rem] rounded-[1.1rem] border border-black/10 bg-white p-5 shadow-[0_18px_45px_rgba(20,16,30,0.04)] transition duration-300 md:min-h-[16rem] md:rounded-[1.2rem] md:hover:z-10 md:hover:scale-[1.045] md:hover:shadow-[0_26px_70px_rgba(20,16,30,0.12)]"
            >
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

function Stages() {
  return (
    <section id="etapas" className="bg-[#f2f2f2] px-5 py-14 text-black md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <h2 className="font-display text-[clamp(1.55rem,8vw,2.2rem)] font-semibold leading-[1.08] tracking-[-0.045em] md:text-[clamp(1.8rem,3.25vw,3.35rem)] md:tracking-[-0.06em]">
            O que cada etapa avalia
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-black/48">
            Os critérios são públicos desde o início. Nenhuma regra usada para avaliar alguém aparece pela primeira vez no resultado.
          </p>
        </div>
        <div className="grid gap-3 rounded-[1.35rem] bg-[#eeeeee] p-3 md:grid-cols-3 md:rounded-[1.8rem]">
          {STAGES.map(({ n, icon: Icon, name, duration, summary, observes }) => (
            <article
              key={n}
              className="group relative flex min-h-[20rem] flex-col overflow-hidden rounded-[1.1rem] border border-black/10 bg-white p-5 shadow-[0_18px_45px_rgba(20,16,30,0.04)] transition duration-300 hover:-translate-y-1 hover:border-black/15 md:rounded-[1.2rem] md:p-6"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand transition duration-300 group-hover:bg-brand group-hover:text-white">
                <Icon className="h-4 w-4" />
              </div>

              <div className="mt-5">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-brand/60">Etapa {n}</p>
                <h3 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-black md:text-xl">{name}</h3>
                <p className="mt-1 text-xs text-black/40">{duration}</p>
                <p className="mt-3 text-sm leading-6 text-black/50">{summary}</p>
              </div>

              <div className="mt-5 border-t border-black/10 pt-4">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-black/38">Competências</p>
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {observes.map((item) => (
                    <li key={item} className="rounded-full border border-black/10 bg-[#f7f7f7] px-2.5 py-1 text-[0.7rem] font-medium text-black/62">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  )
}

function Access() {
  return (
    <section id="acesso" className="bg-white px-5 py-14 text-black md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <h2 className="font-display text-[clamp(1.55rem,8vw,2.2rem)] font-semibold leading-[1.08] tracking-[-0.045em] md:text-[clamp(1.8rem,3.25vw,3.35rem)] md:tracking-[-0.06em]">
            Entrar na plataforma
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-black/48">
            Dois acessos diferentes, cada um com sua área.
          </p>
        </div>

        <div className="grid gap-3 rounded-[1.35rem] bg-[#eeeeee] p-3 md:grid-cols-2 md:rounded-[1.8rem]">
          <article className="flex flex-col rounded-[1.1rem] border border-black/10 bg-white p-6 shadow-[0_18px_45px_rgba(20,16,30,0.04)] md:rounded-[1.2rem] md:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <UserPlus className="h-4 w-4" />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-black md:text-2xl">Sou candidato</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-black/50">
              Inscreva-se no processo, acompanhe em que etapa você está, envie o que for pedido dentro do prazo
              e receba os avisos de cada resultado.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="sm:flex-1">
                <Button className="h-12 w-full rounded-full px-6 text-sm font-semibold">
                  Criar minha conta
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login" className="sm:flex-1">
                <Button variant="outlined" className="h-12 w-full rounded-full px-6 text-sm font-semibold">
                  Já tenho conta
                </Button>
              </Link>
            </div>
          </article>

          <article className="flex flex-col rounded-[1.1rem] border border-black/10 bg-[#111111] p-6 text-white shadow-[0_18px_45px_rgba(20,16,30,0.1)] md:rounded-[1.2rem] md:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-brand-soft">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] md:text-2xl">Sou organizador</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/52">
              Área da comissão avaliadora: configurar etapas e baremas, corrigir entregas, mover candidatos
              de fase e enviar comunicados.
            </p>
            <div className="mt-7">
              <Link to="/admin/login">
                <Button className="h-12 w-full rounded-full bg-white px-6 text-sm font-semibold !text-black hover:bg-brand hover:!text-white sm:w-auto">
                  <LogIn className="h-4 w-4" />
                  Entrar como organizador
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs leading-5 text-white/38">
              O acesso é liberado pela coordenação do processo. Se você é da comissão e ainda não consegue entrar, fale com quem coordena.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0)
  const { data: processo } = useOpenProcess()

  // O prazo entra logo depois da primeira pergunta, e só quando há processo
  // publicado — em rascunho a data ainda vai mudar.
  const items = processo
    ? [
        FAQS[0],
        {
          q: 'Quando começam e terminam as inscrições?',
          a: `As inscrições abrem em ${formatLongDate(processo.registration_start)} e encerram em ${formatLongDate(processo.registration_end)}. Depois desse prazo não é possível se candidatar nesta edição.`,
        },
        ...FAQS.slice(1),
      ]
    : FAQS

  return (
    <section id="faq" className="bg-[#f2f2f2] px-5 py-14 text-black md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <h2 className="font-display text-[clamp(1.55rem,8vw,2.2rem)] font-semibold leading-[1.08] tracking-[-0.045em] md:text-[clamp(1.8rem,3.25vw,3.35rem)] md:tracking-[-0.06em]">
            Perguntas frequentes
          </h2>
        </div>
        <div className="overflow-hidden rounded-[1.35rem] border border-black/10 bg-white shadow-[0_18px_50px_rgba(20,16,30,0.05)] md:rounded-[1.8rem]">
          {items.map(({ q, a }, index) => {
            const isOpen = open === index
            return (
              <div key={q} className={index > 0 ? 'border-t border-black/10' : ''}>
                <button className="flex w-full items-center gap-3 px-4 py-4 text-left md:gap-5 md:px-8 md:py-5" onClick={() => setOpen(isOpen ? null : index)}>
                  <span className="text-xs text-brand/32">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex-1 text-sm font-semibold tracking-[-0.02em] text-black md:text-base">{q}</span>
                  <ChevronDown className={['h-4 w-4 text-brand transition-transform', isOpen ? 'rotate-180' : ''].join(' ')} />
                </button>
                <div className="grid transition-all" style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
                  <div className="overflow-hidden">
                    <p className="px-4 pb-5 text-sm leading-7 text-black/48 md:px-[4.6rem] md:pb-6 md:text-base md:leading-8">{a}</p>
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

function FinalCTA() {
  return (
    <section className="bg-white px-5 py-20 text-white md:px-10">
      <div className="purple-cta mx-auto max-w-7xl overflow-hidden rounded-[1.35rem] p-5 md:rounded-[2rem] md:p-10">
        <div className="md:p-4">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-white/42">Processo Seletivo 2026.2</p>
          <h2 className="mt-4 max-w-4xl font-display text-[clamp(1.55rem,8vw,2.2rem)] font-semibold leading-[1.08] tracking-[-0.045em] md:text-[clamp(1.8rem,3.25vw,3.35rem)] md:tracking-[-0.06em]">
            Vem construir a Liga com a gente
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/58 md:mt-6 md:text-lg md:leading-8">
            Selecionamos pessoas com potencial e comprometimento para construir a Liga conosco,
            não apenas quem já chega pronto.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row md:flex-wrap">
            <Link to="/register">
              <Button className="h-12 w-full rounded-full bg-black px-7 text-white hover:bg-white hover:!text-black sm:w-auto">
                Quero me candidatar
              </Button>
            </Link>
            {(
              <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer">
                <Button variant="outlined" className="h-12 w-full rounded-full border-white/20 bg-white/[0.06] px-7 text-white hover:bg-white/10 hover:text-white sm:w-auto">
                  <WhatsAppIcon className="h-4 w-4" />
                  Acesse o grupo da Liga
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const columns: [string, [string, string][]][] = [
    [
      'Processo',
      [
        ['A Liga', '#liga'],
        ['Como funciona', '#processo'],
        ['Etapas', '#etapas'],
        ['FAQ', '#faq'],
      ],
    ],
    [
      'Plataforma',
      [
        ['Criar conta', '/register'],
        ['Entrar como candidato', '/login'],
        ['Entrar como organizador', '/admin/login'],
      ],
    ],
  ]

  return (
    <footer className="bg-white p-2 pt-0 text-white md:p-3 md:pt-0">
      <div className="overflow-hidden rounded-[1.45rem] bg-[#111111] px-5 py-12 shadow-[0_26px_90px_rgba(0,0,0,0.24)] md:rounded-[1.75rem] md:px-10 md:py-14">
        <div className="mx-auto w-full max-w-[88rem]">
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 py-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] md:gap-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Liga de TI" className="h-7 brightness-0 invert" />
                <span className="font-semibold">Processo Seletivo</span>
              </div>
              <p className="mt-6 max-w-sm text-sm leading-7 text-white/46">
                Plataforma oficial do processo seletivo da Liga de TI: inscrição, acompanhamento das etapas,
                entrega do case e comunicação com os candidatos.
              </p>
            </div>
            {columns.map(([title, items]) => (
              <div key={title}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/36">{title}</h3>
                <div className="mt-5 flex flex-col gap-3 text-sm text-white/54">
                  {items.map(([label, href]) =>
                    href.startsWith('#') ? (
                      <a key={label} href={href} className="hover:text-white">
                        {label}
                      </a>
                    ) : (
                      <Link key={label} to={href} className="hover:text-white">
                        {label}
                      </Link>
                    ),
                  )}
                </div>
              </div>
            ))}
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/36">Liga de TI</h3>
              <div className="mt-5 space-y-4 text-sm text-white/54">
                <p>PUC-Campinas</p>
                <p>Tecnologia e empreendedorismo</p>
                <p>Desde março de 2024</p>
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
      <ValuesStrip />
      <AboutLiga />
      <HowItWorks />
      <Stages />
      <Access />
      <FAQ />
      <FinalCTA />
      <Footer />
    </>
  )
}

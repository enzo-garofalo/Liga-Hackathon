import { useEffect } from 'react'
import type { ElementType } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { GitBranch, Link2, Lock, User, CheckCircle2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'
import type { UpdateMePayload } from '../types/participant'
import { getApiError } from '../utils/errors'

interface FormShape {
  full_name: string
  phone: string
  course: string
  semester: string
  bio: string
  github: string
  linkedin: string
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 2) return digits ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function validatePhone(value: string) {
  if (!value.trim()) return true
  const digits = onlyDigits(value)
  if (digits.length < 10 || digits.length > 11) return 'Informe um telefone com DDD.'
  return true
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const COURSES = [
  'Ciência da Computação',
  'Sistemas de Informação',
  'Engenharia de Computação',
  'Engenharia de Software',
  'Análise e Desenvolvimento de Sistemas',
  'Redes de Computadores',
  'Tecnologia em Jogos Digitais',
  'Engenharia Elétrica',
  'Engenharia de Telecomunicações',
  'Outro',
]

function fieldCls(hasError?: boolean) {
  return [
    'w-full h-11 px-3.5 rounded-xl border font-ui text-sm text-[#101114]',
    'placeholder:text-[#9497a9] bg-white',
    'focus:outline-none focus:ring-2 focus:ring-[#7132f5]/10 focus:border-[#7132f5]',
    'transition-colors',
    hasError ? 'border-red-400' : 'border-[#dedee5]',
  ].join(' ')
}

const labelCls = 'text-sm font-medium text-[#101114] mb-1.5 block'

function SectionHeader({ icon: Icon, title }: { icon: ElementType; title: string }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#7132f5]" />
        <span className="font-medium text-sm text-[#9497a9] uppercase tracking-wider font-ui">
          {title}
        </span>
      </div>
      <hr className="border-[#dedee5] my-4" />
    </>
  )
}

export function ProfilePage() {
  const meQuery = useProfile()
  const updateMutation = useUpdateProfile()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormShape>({
    defaultValues: { full_name: '', phone: '', course: '', semester: '', bio: '', github: '', linkedin: '' },
  })

  const phoneValue = useWatch({ control, name: 'phone' }) ?? ''
  const phoneField = register('phone', { validate: validatePhone })

  const watchedName = watch('full_name')
  const watchedBio = watch('bio')

  useEffect(() => {
    if (meQuery.data) {
      reset({
        full_name: meQuery.data.full_name,
        phone: meQuery.data.phone ? formatPhone(meQuery.data.phone) : '',
        course: meQuery.data.course,
        semester: String(meQuery.data.semester),
        bio: meQuery.data.bio,
        github: meQuery.data.github ?? '',
        linkedin: meQuery.data.linkedin ?? '',
      })
    }
  }, [meQuery.data, reset])

  const onSubmit = handleSubmit((data) => {
    const payload: UpdateMePayload = {
      full_name: data.full_name,
      phone: onlyDigits(data.phone) || null,
      course: data.course,
      semester: Number(data.semester),
      bio: data.bio,
      github: data.github || null,
      linkedin: data.linkedin || null,
    }
    updateMutation.mutate(payload)
  })

  const displayName = watchedName || meQuery.data?.full_name || ''
  const bioLength = (watchedBio || '').length

  const teamBadge = meQuery.data
    ? meQuery.data.has_team && meQuery.data.team
      ? { text: `Equipe: ${meQuery.data.team.name}`, cls: 'bg-green-50 text-green-600' }
      : { text: 'Sem equipe', cls: 'bg-amber-50 text-amber-600' }
    : null

  const handleCancel = () => {
    if (meQuery.data) {
      reset({
        full_name: meQuery.data.full_name,
        phone: meQuery.data.phone ? formatPhone(meQuery.data.phone) : '',
        course: meQuery.data.course,
        semester: String(meQuery.data.semester),
        bio: meQuery.data.bio,
        github: meQuery.data.github ?? '',
        linkedin: meQuery.data.linkedin ?? '',
      })
    }
  }

  return (
    <div className="min-h-full flex flex-col bg-[#f7f7fb]">

      {/* ── Content ── */}
      <div className="flex-1 px-4 md:px-8 pt-8 pb-6">
        <div className="max-w-5xl mx-auto">

          {/* ── Banner + Avatar ── */}
          <div className="relative mb-16">
            <div className="relative h-32 rounded-2xl bg-gradient-to-r from-[#7132f5]/10 to-transparent overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle, rgba(113,50,245,0.07) 1px, transparent 1px)`,
                  backgroundSize: '20px 20px',
                }}
              />
            </div>

            {/* Avatar — overlapping banner, responsive */}
            <div className={[
              'absolute rounded-2xl bg-[#7132f5] text-white font-display font-semibold',
              'flex items-center justify-center border-4 border-white shadow-lg shadow-[#7132f5]/20',
              'w-16 h-16 text-xl -bottom-8 left-1/2 -translate-x-1/2',
              'md:w-24 md:h-24 md:text-3xl md:-bottom-12 md:left-8 md:translate-x-0',
            ].join(' ')}>
              {displayName ? initials(displayName) : '?'}
            </div>
          </div>

          {/* ── Loading ── */}
          {meQuery.isLoading && (
            <div className="bg-white rounded-2xl border border-[#dedee5] p-10 text-center">
              <p className="font-ui text-[#9497a9] text-sm">Carregando perfil…</p>
            </div>
          )}

          {meQuery.data && (
            <>
              {/* ── Name + email + badge ── */}
              <div className="text-center md:text-left pt-2 md:pt-0 md:pl-36 mb-8">
                <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
                  <h1 className="font-display font-semibold text-2xl text-[#101114]">
                    {displayName || (
                      <span className="text-[#9497a9] italic font-normal text-xl">Seu nome</span>
                    )}
                  </h1>
                  {teamBadge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-ui ${teamBadge.cls}`}>
                      {teamBadge.text}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#9497a9] mt-0.5 font-ui">{meQuery.data.email}</p>
              </div>

              {/* ── Form ── */}
              <form id="profile-form" onSubmit={onSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Left: Personal info */}
                  <div className="bg-white border border-[#dedee5] rounded-xl p-6">
                    <SectionHeader icon={User} title="Informações pessoais" />

                    {/* Email readonly */}
                    <div className="mb-5">
                      <label className={labelCls}>E-mail</label>
                      <div className="relative">
                        <input
                          type="email"
                          value={meQuery.data.email}
                          readOnly
                          tabIndex={-1}
                          className="w-full h-11 px-3.5 pr-10 rounded-xl border border-[#dedee5] font-ui text-sm text-[#9497a9] bg-gray-50 cursor-not-allowed"
                        />
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9497a9] pointer-events-none" />
                      </div>
                      <p className="text-xs text-[#9497a9] mt-1 font-ui">O e-mail não pode ser alterado</p>
                    </div>

                    <div className="flex flex-col gap-5">
                      {/* Full name */}
                      <div>
                        <label className={labelCls}>Nome completo</label>
                        <input
                          {...register('full_name', { required: 'Informe seu nome.' })}
                          placeholder="Seu nome completo"
                          className={fieldCls(!!errors.full_name)}
                        />
                        {errors.full_name && (
                          <p className="text-xs text-red-500 mt-1 font-ui">{errors.full_name.message}</p>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label className={labelCls}>Telefone</label>
                        <input
                          {...phoneField}
                          type="tel"
                          inputMode="numeric"
                          placeholder="(11) 99999-9999"
                          value={formatPhone(phoneValue)}
                          onChange={(e) => {
                            phoneField.onChange(e)
                            setValue('phone', onlyDigits(e.target.value), { shouldDirty: true })
                          }}
                          className={fieldCls(!!errors.phone)}
                        />
                        {errors.phone && (
                          <p className="text-xs text-red-500 mt-1 font-ui">{errors.phone.message}</p>
                        )}
                      </div>

                      {/* Course — select */}
                      <div>
                        <label className={labelCls}>Curso</label>
                        <select
                          {...register('course', { required: 'Informe seu curso.' })}
                          className={fieldCls(!!errors.course)}
                        >
                          <option value="">Selecione seu curso…</option>
                          {meQuery.data.course && !COURSES.includes(meQuery.data.course) && (
                            <option value={meQuery.data.course}>{meQuery.data.course}</option>
                          )}
                          {COURSES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        {errors.course && (
                          <p className="text-xs text-red-500 mt-1 font-ui">{errors.course.message}</p>
                        )}
                      </div>

                      {/* Semester */}
                      <div>
                        <label className={labelCls}>Semestre atual</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          {...register('semester', {
                            required: 'Informe seu semestre.',
                            min: { value: 1, message: 'Mínimo 1.' },
                            max: { value: 20, message: 'Máximo 20.' },
                          })}
                          className={[
                            'w-24 h-11 px-3.5 rounded-xl border font-ui text-sm text-[#101114]',
                            'bg-white focus:outline-none focus:ring-2 focus:ring-[#7132f5]/10',
                            'focus:border-[#7132f5] transition-colors',
                            errors.semester ? 'border-red-400' : 'border-[#dedee5]',
                          ].join(' ')}
                        />
                        {errors.semester && (
                          <p className="text-xs text-red-500 mt-1 font-ui">{errors.semester.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Links + Bio */}
                  <div className="flex flex-col gap-4">

                    {/* Links card */}
                    <div className="bg-white border border-[#dedee5] rounded-xl p-6">
                      <SectionHeader icon={GitBranch} title="Links profissionais" />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>GitHub</label>
                          <div className="relative">
                            <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9497a9] pointer-events-none" />
                            <input
                              {...register('github')}
                              placeholder="github.com/usuario"
                              className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-[#dedee5] font-ui text-sm text-[#101114] placeholder:text-[#9497a9] bg-white focus:outline-none focus:ring-2 focus:ring-[#7132f5]/10 focus:border-[#7132f5] transition-colors"
                            />
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>LinkedIn</label>
                          <div className="relative">
                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9497a9] pointer-events-none" />
                            <input
                              {...register('linkedin')}
                              placeholder="linkedin.com/in/usuario"
                              className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-[#dedee5] font-ui text-sm text-[#101114] placeholder:text-[#9497a9] bg-white focus:outline-none focus:ring-2 focus:ring-[#7132f5]/10 focus:border-[#7132f5] transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bio card */}
                    <div className="bg-white border border-[#dedee5] rounded-xl p-6">
                      <SectionHeader icon={User} title="Sobre você" />
                      <div>
                        <label className={labelCls}>Bio</label>
                        <div className="relative">
                          <textarea
                            rows={6}
                            placeholder="Conte um pouco sobre você, suas habilidades e interesses…"
                            {...register('bio', {
                              required: 'Conte um pouco sobre você.',
                              maxLength: { value: 500, message: 'Máximo 500 caracteres.' },
                            })}
                            className={[
                              'w-full px-3.5 py-2.5 pb-6 rounded-xl border font-ui text-sm text-[#101114]',
                              'placeholder:text-[#9497a9] bg-white resize-y min-h-[140px]',
                              'focus:outline-none focus:ring-2 focus:ring-[#7132f5]/10 focus:border-[#7132f5]',
                              'transition-colors',
                              errors.bio ? 'border-red-400' : 'border-[#dedee5]',
                            ].join(' ')}
                          />
                          <span className="absolute bottom-2 right-3 text-xs text-[#9497a9] font-ui pointer-events-none select-none">
                            {bioLength}/500
                          </span>
                        </div>
                        {errors.bio && (
                          <p className="text-xs text-red-500 mt-1 font-ui">{errors.bio.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* ── Sticky footer ── */}
      {meQuery.data && (
        <div className="sticky bottom-0 bg-white border-t border-[#dedee5] py-4 px-4 md:px-8 z-10">
          <div className="max-w-5xl mx-auto flex items-center justify-end gap-3">
            {updateMutation.isSuccess && !isDirty && (
              <span className="flex items-center gap-1.5 text-sm font-ui font-medium text-green-600 mr-auto">
                <CheckCircle2 className="w-4 h-4" />
                Perfil atualizado
              </span>
            )}
            {updateMutation.error && (
              <p className="text-sm text-red-500 font-ui mr-auto">{getApiError(updateMutation.error)}</p>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={!isDirty}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="profile-form"
              variant="primary"
              loading={updateMutation.isPending}
              disabled={!isDirty}
            >
              Salvar alterações
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

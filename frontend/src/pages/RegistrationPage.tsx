import logo from '../assets/logo.svg'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useTeamRegistration } from '../hooks/useTeamRegistration'
import { getApiError } from '../utils/errors'

export function RegistrationPage() {
  const { step, form, fields, goToStep2, goBack, onSubmit, isPending, apiError } =
    useTeamRegistration()
  const {
    register,
    formState: { errors },
    watch,
  } = form

  const leaderIndex = watch('leader_index')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-[#dedee5] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img src={logo} alt="Liga de TI" className="h-7" />
          <span className="font-display font-semibold text-near-black">Liga de TI</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="font-display text-3xl font-semibold text-near-black">
            Inscrição para o Hackathon
          </h1>
          <p className="mt-2 text-sm text-silver-blue font-ui">
            Preencha os dados da sua equipe para participar.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          <StepDot active={step >= 1} label="1" />
          <div className={`h-px flex-1 transition-colors ${step >= 2 ? 'bg-brand' : 'bg-[#dedee5]'}`} />
          <StepDot active={step >= 2} label="2" />
        </div>

        <form onSubmit={onSubmit}>
          <div className="bg-white rounded-2xl border border-[#dedee5] shadow-whisper p-8">
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="font-display text-lg font-semibold text-near-black mb-1">
                  Dados da equipe
                </h2>

                <Input
                  label="Nome da equipe"
                  placeholder="Ex: DevSquad"
                  error={errors.name?.message}
                  {...register('name', { required: 'Campo obrigatório' })}
                />

                <Input
                  label="Título do projeto"
                  placeholder="Ex: Sistema de gestão de saúde"
                  error={errors.title?.message}
                  {...register('title', { required: 'Campo obrigatório' })}
                />

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium font-ui text-near-black">Proposta</label>
                  <textarea
                    rows={4}
                    placeholder="Descreva a proposta do projeto..."
                    className={[
                      'w-full px-3.5 py-2.5 rounded-xl border font-ui text-sm text-near-black',
                      'placeholder:text-silver-blue bg-white resize-none',
                      'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors',
                      errors.proposal ? 'border-red-400' : 'border-[#dedee5]',
                    ].join(' ')}
                    {...register('proposal', { required: 'Campo obrigatório' })}
                  />
                  {errors.proposal && (
                    <p className="text-xs text-red-500 font-ui">{errors.proposal.message}</p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="button" onClick={goToStep2}>
                    Próximo
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="mb-1">
                  <h2 className="font-display text-lg font-semibold text-near-black">
                    Participantes
                  </h2>
                  <p className="text-sm text-silver-blue font-ui mt-1">
                    Selecione o líder da equipe com o botão de rádio.
                  </p>
                </div>

                {fields.map((field, i) => {
                  const isLeader = leaderIndex === String(i)
                  return (
                    <div
                      key={field.id}
                      className="rounded-xl border p-5 transition-colors"
                      style={
                        isLeader
                          ? { borderColor: '#7132f5', backgroundColor: 'rgba(133,91,251,0.08)' }
                          : { borderColor: '#dedee5', backgroundColor: 'white' }
                      }
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-ui font-medium text-near-black text-sm">
                          Participante {i + 1}
                        </h3>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="radio"
                            value={String(i)}
                            {...register('leader_index')}
                            className="accent-brand w-4 h-4 cursor-pointer"
                          />
                          <span className="text-sm font-ui text-silver-blue">Líder</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <Input
                            label="Nome completo"
                            error={errors.participants?.[i]?.full_name?.message}
                            {...register(`participants.${i}.full_name`, {
                              required: 'Obrigatório',
                            })}
                          />
                        </div>
                        <Input
                          label="E-mail"
                          type="email"
                          error={errors.participants?.[i]?.email?.message}
                          {...register(`participants.${i}.email`, { required: 'Obrigatório' })}
                        />
                        <Input
                          label="Telefone"
                          placeholder="11999999999"
                          error={errors.participants?.[i]?.phone?.message}
                          {...register(`participants.${i}.phone`, { required: 'Obrigatório' })}
                        />
                        <Input
                          label="RA"
                          placeholder="23.00001-1"
                          error={errors.participants?.[i]?.ra?.message}
                          {...register(`participants.${i}.ra`, { required: 'Obrigatório' })}
                        />
                        <Input
                          label="GitHub (opcional)"
                          placeholder="https://github.com/usuario"
                          {...register(`participants.${i}.github`)}
                        />
                      </div>
                    </div>
                  )
                })}

                {apiError && (
                  <p className="text-sm text-red-500 font-ui text-center">
                    {getApiError(apiError)}
                  </p>
                )}

                <div className="flex justify-between pt-2">
                  <Button type="button" variant="outlined" onClick={goBack}>
                    Voltar
                  </Button>
                  <Button type="submit" loading={isPending}>
                    Enviar inscrição
                  </Button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

function StepDot({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      className={[
        'w-8 h-8 rounded-full flex items-center justify-center',
        'text-sm font-medium font-ui transition-colors shrink-0',
        active ? 'bg-brand text-white' : 'bg-[#dedee5] text-silver-blue',
      ].join(' ')}
    >
      {label}
    </div>
  )
}

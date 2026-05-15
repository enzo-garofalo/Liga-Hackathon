import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Header } from '../components/Header'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'
import type { UpdateMePayload } from '../types/participant'
import { getApiError } from '../utils/errors'

interface FormShape {
  full_name: string
  course: string
  semester: string
  bio: string
  github: string
  linkedin: string
}

export function ProfilePage() {
  const meQuery = useProfile()
  const updateMutation = useUpdateProfile()

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormShape>({
    defaultValues: { full_name: '', course: '', semester: '', bio: '', github: '', linkedin: '' },
  })

  useEffect(() => {
    if (meQuery.data) {
      reset({
        full_name: meQuery.data.full_name,
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
      course: data.course,
      semester: Number(data.semester),
      bio: data.bio,
      github: data.github || null,
      linkedin: data.linkedin || null,
    }
    updateMutation.mutate(payload)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Header me={meQuery.data} />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-semibold text-near-black mb-6">
          Editar perfil
        </h1>
        {meQuery.isLoading && <p className="font-ui text-silver-blue">Carregando...</p>}
        {meQuery.data && (
          <form
            onSubmit={onSubmit}
            className="bg-white rounded-2xl border border-[#dedee5] shadow-whisper p-8 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <p className="text-sm font-medium font-ui text-near-black mb-1">E-mail</p>
                <p className="text-sm font-ui text-silver-blue">{meQuery.data.email}</p>
              </div>
              <Input
                label="Nome completo"
                {...register('full_name', { required: 'Informe seu nome.' })}
                error={errors.full_name?.message}
              />
              <Input
                label="Curso"
                {...register('course', { required: 'Informe seu curso.' })}
                error={errors.course?.message}
              />
              <Input
                label="Semestre"
                type="number"
                min={1}
                max={20}
                {...register('semester', {
                  required: 'Informe seu semestre.',
                  min: { value: 1, message: 'Mínimo 1.' },
                  max: { value: 20, message: 'Máximo 20.' },
                })}
                error={errors.semester?.message}
              />
              <Input label="GitHub" placeholder="https://github.com/usuario" {...register('github')} />
              <div className="md:col-span-2">
                <Input
                  label="LinkedIn"
                  placeholder="https://linkedin.com/in/usuario"
                  {...register('linkedin')}
                />
              </div>
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium font-ui text-near-black">Bio</label>
                <textarea
                  rows={4}
                  {...register('bio', { required: 'Conte um pouco sobre você.' })}
                  className={[
                    'w-full px-3.5 py-2.5 rounded-xl border font-ui text-sm text-near-black',
                    'placeholder:text-silver-blue bg-white',
                    'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
                    'transition-colors resize-y',
                    errors.bio ? 'border-red-400' : 'border-[#dedee5]',
                  ].join(' ')}
                />
                {errors.bio && <p className="text-xs text-red-500 font-ui">{errors.bio.message}</p>}
              </div>
            </div>
            {updateMutation.error && (
              <p className="text-sm text-red-500 font-ui">{getApiError(updateMutation.error)}</p>
            )}
            {updateMutation.isSuccess && !isDirty && (
              <p className="text-sm text-brand-green font-ui">Perfil atualizado.</p>
            )}
            <Button
              type="submit"
              variant="primary"
              loading={updateMutation.isPending}
              disabled={!isDirty}
            >
              Salvar alterações
            </Button>
          </form>
        )}
      </main>
    </div>
  )
}

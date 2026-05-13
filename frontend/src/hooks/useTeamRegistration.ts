import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { createTeam } from '../api/teams'
import type { CreateTeamPayload } from '../types'

interface ParticipantFields {
  full_name: string
  email: string
  phone: string
  ra: string
  github: string
}

export interface RegistrationForm {
  name: string
  title: string
  proposal: string
  leader_index: string
  participants: ParticipantFields[]
}

const emptyParticipant = (): ParticipantFields => ({
  full_name: '',
  email: '',
  phone: '',
  ra: '',
  github: '',
})

export function useTeamRegistration() {
  const [step, setStep] = useState<1 | 2>(1)
  const navigate = useNavigate()

  const form = useForm<RegistrationForm>({
    defaultValues: {
      name: '',
      title: '',
      proposal: '',
      leader_index: '0',
      participants: Array.from({ length: 4 }, emptyParticipant),
    },
  })

  const { fields } = useFieldArray({ control: form.control, name: 'participants' })

  const mutation = useMutation({
    mutationFn: (payload: CreateTeamPayload) => createTeam(payload),
    onSuccess: (team) => navigate(`/confirmacao/${team.id}`),
  })

  const goToStep2 = async () => {
    const valid = await form.trigger(['name', 'title', 'proposal'])
    if (valid) setStep(2)
  }

  const onSubmit = form.handleSubmit((data) => {
    const leaderIndex = Number(data.leader_index)
    const payload: CreateTeamPayload = {
      name: data.name,
      title: data.title,
      proposal: data.proposal,
      participants: data.participants.map((p, i) => ({
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        ra: p.ra,
        github: p.github || null,
        is_leader: i === leaderIndex,
      })),
    }
    mutation.mutate(payload)
  })

  return {
    step,
    form,
    fields,
    goToStep2,
    goBack: () => setStep(1),
    onSubmit,
    isPending: mutation.isPending,
    apiError: mutation.error,
  }
}

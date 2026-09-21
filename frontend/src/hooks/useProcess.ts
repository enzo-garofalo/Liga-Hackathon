import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
<<<<<<< HEAD
import { applyToProcess, getProcess } from '../api/processes'
=======
import { applyToProcess, getProcess, withdrawFromProcess } from '../api/processes'
>>>>>>> feature/v3-processo-seletivo
import { retryUnlessClientError } from '../utils/errors'

export function useProcess(id: string | undefined) {
  return useQuery({
    queryKey: ['process', id],
    queryFn: () => getProcess(id as string),
    retry: retryUnlessClientError,
    enabled: Boolean(id),
  })
}

export function useApplyToProcess(id: string | undefined) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: () => applyToProcess(id as string),
    onSuccess: (application) => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
      queryClient.invalidateQueries({ queryKey: ['my-applications'] })
      navigate(`/applications/${application.id}`)
    },
  })
}
<<<<<<< HEAD
=======

/**
 * Cancela a própria inscrição.
 *
 * Sem navegar para lugar nenhum: a pessoa fica na tela do processo, que passa
 * a oferecer "Inscrever-se" de novo enquanto o prazo estiver aberto. Por isso
 * a consulta do processo também é invalidada aqui, e não só a lista.
 */
export function useWithdrawFromProcess(id: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => withdrawFromProcess(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process', id] })
      queryClient.invalidateQueries({ queryKey: ['processes'] })
      queryClient.invalidateQueries({ queryKey: ['my-applications'] })
    },
  })
}
>>>>>>> feature/v3-processo-seletivo

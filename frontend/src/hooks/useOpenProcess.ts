import { useQuery } from '@tanstack/react-query'
import { getOpenProcess } from '../api/openProcess'
import { retryUnlessClientError } from '../utils/errors'

/**
 * Periodo de inscricoes mostrado na landing.
 *
 * Le do processo publicado em vez de datas escritas no codigo: o organizador
 * ajusta em "Editar processo" e o site acompanha, sem novo deploy.
 */
export function useOpenProcess() {
  return useQuery({
    queryKey: ['open-process'],
    queryFn: getOpenProcess,
    retry: retryUnlessClientError,
  })
}

import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { loginAdmin } from '../api/teams'

interface LoginForm {
  username: string
  password: string
}

export function useAdminLogin() {
  const navigate = useNavigate()
  const form = useForm<LoginForm>({ defaultValues: { username: '', password: '' } })

  const mutation = useMutation({
    mutationFn: ({ username, password }: LoginForm) => loginAdmin(username, password),
    onSuccess: (data) => {
      sessionStorage.setItem('access_token', data.access)
      sessionStorage.setItem('refresh_token', data.refresh)
      navigate('/admin/dashboard')
    },
  })

  return {
    form,
    onSubmit: form.handleSubmit((data) => mutation.mutate(data)),
    isPending: mutation.isPending,
    apiError: mutation.error,
  }
}

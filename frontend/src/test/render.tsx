import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'

/**
 * Renderiza com os mesmos providers do `main.tsx`.
 *
 * Cada teste ganha um QueryClient novo e sem novas tentativas, para uma falha
 * simulada aparecer na hora em vez de esperar o backoff.
 */
export function renderWithProviders(ui: ReactElement, { route = '/' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      // retryDelay zerado: os hooks da v3 definem a propria politica de nova
      // tentativa, que sobrepoe o retry: false — sem isto um 500 simulado
      // esperaria o backoff real.
      queries: { retry: false, retryDelay: 0 },
      mutations: { retry: false },
    },
  })

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          {ui}
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

/**
 * Convite do grupo da Liga no WhatsApp.
 *
 * O endereço fica aqui como padrão, e não só em variável de ambiente, porque
 * antes o valor caía para `'#'` quando a variável não estava configurada: o
 * botão simplesmente não aparecia, sem erro nenhum, e ninguém descobria até
 * alguém perguntar onde estava o grupo.
 *
 * `VITE_WHATSAPP_LINK` continua valendo e sobrepõe este valor, para a Liga
 * trocar o convite sem mexer no código.
 */
const configurado = (
  import.meta.env.VITE_WHATSAPP_LINK as string | undefined
)?.trim()

export const WHATSAPP_LINK =
  configurado || 'https://chat.whatsapp.com/EsXKmj0TbnH4qnyrzoCKfU'

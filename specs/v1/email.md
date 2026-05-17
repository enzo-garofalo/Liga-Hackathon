# Emails

## Gatilhos
- Equipe aprovada → e-mail para todos os participantes.
- Equipe recusada → e-mail para todos os participantes.

## Aprovação — assunto e conteúdo
Assunto: `[Liga de TI] Sua equipe foi aprovada para o Hackathon!`

Corpo (texto + HTML):
- Parabéns, equipe {team.name}!
- Confirmação da participação no hackathon.
- Próximos passos (a definir com a organização — usar placeholder por ora).
- Assinatura da Liga de TI.

## Recusa — assunto e conteúdo
Assunto: `[Liga de TI] Resultado da inscrição para o Hackathon`

Corpo:
- Agradecimento pela participação.
- Informar que a equipe não foi selecionada nesta edição.
- Incentivo para futuras edições.
- Assinatura da Liga de TI.

## Implementação
- Usar `django.core.mail.send_mail` ou `EmailMultiAlternatives` para HTML.
- Disparar de forma síncrona por ora (sem Celery).
  Se volume crescer, extrair para task assíncrona no futuro.
- Configurar via variáveis de ambiente: EMAIL_HOST, EMAIL_PORT,
  EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, DEFAULT_FROM_EMAIL.
- Em desenvolvimento: usar `django.core.mail.backends.console.EmailBackend`.
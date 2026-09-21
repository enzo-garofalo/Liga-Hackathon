# Deploy no Railway — passo a passo

Roteiro para colocar a v3 (processo seletivo) em produção no Railway. Tudo aqui vem do
que já existe no repositório: `backend/railway.toml`, `frontend/railway.toml`,
`backend/entrypoint.sh`, `backend/config/settings/production.py` e
`docker-compose.prod.yml` (que é a mesma topologia, em Compose).

## Topologia

Um projeto Railway com **cinco serviços**:

| Serviço    | Origem                              | Papel |
|------------|-------------------------------------|-------|
| `postgres` | plugin do Railway                   | banco; fornece `DATABASE_URL` |
| `redis`    | plugin do Railway                   | broker do Celery; fornece `REDIS_URL` |
| `backend`  | repo, `backend/Dockerfile.prod`     | gunicorn via `entrypoint.sh` + **volume** de mídia |
| `worker`   | repo, mesmo Dockerfile              | `celery -A core worker` — sem ele nenhum e-mail sai |
| `frontend` | repo, `frontend/Dockerfile.prod`    | build Vite servido por nginx |

Se o hackathon já está no ar, `postgres`, `backend` e `frontend` provavelmente existem.
O que a v3 acrescenta: **redis, worker, volume de mídia e algumas variáveis**. Confira no
painel antes de criar — o hackathon também manda e-mail pelo Celery, então redis e worker
podem já estar lá.

## 1. Antes de subir

- `git push origin main`. A `main` já contém a v3 inteira.
- Gerar um `DJANGO_SECRET_KEY` de produção (`python -c "import secrets; print(secrets.token_urlsafe(50))"`).
- Ter a chave do Resend e o domínio remetente verificado na conta.

## 2. Postgres e Redis

- **New → Database → PostgreSQL**, se não existir. Não precisa de configuração.
- **New → Database → Redis**. Idem.

## 3. Serviço `backend`

1. **New → GitHub Repo** → este repositório.
2. Settings → **Root Directory**: raiz do repo. O `Dockerfile.prod` faz `COPY backend/ .`
   com contexto na raiz; um root directory `backend/` quebra o build.
3. Settings → **Config-as-code**: `/backend/railway.toml` (o Railway pede o caminho
   absoluto no repositório). Ele já define o builder
   Dockerfile, o caminho `backend/Dockerfile.prod`, o healthcheck em `/api/v1/health/`
   (timeout 120 s) e restart `on_failure`.
4. Settings → **Volumes → Add Volume**, mount path `/app/media`. Sem ele os entregáveis
   dos candidatos somem a cada deploy (decisions.md §5).
5. **Variables**. As quatro primeiras são validadas pelo `entrypoint.sh`, que aborta se
   faltar alguma:

   ```
   DJANGO_SECRET_KEY=<gerado no passo 1>
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   DJANGO_ADMIN_USERNAME=<admin>
   DJANGO_ADMIN_PASSWORD=<senha forte>
   DJANGO_ADMIN_EMAIL=<email>

   REDIS_URL=${{Redis.REDIS_URL}}
   ALLOWED_HOSTS=<dominio-do-backend>.up.railway.app
   CORS_ALLOWED_ORIGINS=https://<dominio-do-frontend>.up.railway.app

   RESEND_API_KEY=re_...
   DEFAULT_FROM_EMAIL=Liga de TI <noreply@ligadeti.com.br>

   MEDIA_ROOT=/app/media
   MAX_UPLOAD_BYTES=10485760
   TEAM_DEADLINE=2026-05-30
   ```

   - `production.py` lê `REDIS_URL` sem fallback: sem a variável o processo não sobe.
   - `production.py` força `EMAIL_BACKEND` para o Resend. Não defina `EMAIL_BACKEND`.
   - `ALLOWED_HOSTS` aceita vários hosts separados por vírgula; `healthcheck.railway.app`
     já é acrescentado pelo código.
   - **Nunca** defina `CELERY_TASK_ALWAYS_EAGER` em produção.
6. Settings → Networking → **Generate Domain**. Esse domínio vai em `ALLOWED_HOSTS` aqui e
   em `VITE_API_URL` no frontend.

## 4. Serviço `worker`

1. **New → GitHub Repo** → o mesmo repositório, root directory na raiz.
2. Settings → **Config-as-code**: `/backend/railway.worker.toml`. Ele aponta para o mesmo
   `backend/Dockerfile.prod`, troca o start command por
   `celery -A core worker --loglevel=info` (substitui o `CMD ["./entrypoint.sh"]`: o
   worker não roda migração nem gunicorn) e **não define healthcheck** — o worker não
   expõe HTTP, e herdar o healthcheck do `backend/railway.toml` faria o deploy falhar.
   Config-as-code vence o painel, então não precisa mexer em mais nada de build/deploy.
3. **Variables**: as mesmas do backend (copie pelo *Raw Editor*) **mais**:

   ```
   DJANGO_SETTINGS_MODULE=config.settings.production
   ```

   No backend quem exporta isso é o `entrypoint.sh`, que aqui não roda. Sem a variável o
   worker sobe com `core.settings`: DEBUG ligado, banco errado, e-mail no console.
4. **Não** monte o volume de mídia aqui. Um volume do Railway liga a um único serviço, e
   as tasks de e-mail não leem arquivo.

## 5. Serviço `frontend`

1. **New → GitHub Repo** → mesmo repositório, root directory na raiz, config file
   `/frontend/railway.toml` (Dockerfile `frontend/Dockerfile.prod`).
2. **Variables**. São *build args* repassados pelo toml; mudar exige redeploy:

   ```
   VITE_API_URL=https://<dominio-do-backend>.up.railway.app
   VITE_WHATSAPP_LINK=https://chat.whatsapp.com/...
   ```

   `VITE_API_URL` é só a **origem**: `api/client.ts` acrescenta `/api/v1` sozinho.
   Não inclua o caminho.
3. O nginx escuta em `$PORT`, substituído no `CMD` do Dockerfile. O Railway injeta `PORT`.
4. Settings → Networking → **Generate Domain** (ou domínio próprio). Volte ao backend e
   coloque esse domínio, com `https://`, em `CORS_ALLOWED_ORIGINS`.

## 6. Ordem do primeiro deploy

1. Postgres e Redis prontos.
2. Backend. No log do `entrypoint.sh`, a sequência esperada:
   `Waiting for database` → `Running migrations` → `Collecting static files` →
   `Ensuring superuser exists` → `Ensuring the selection process exists` →
   `Starting gunicorn`. Se parar em `missing required environment variables`, faltou
   algo do passo 3.
3. Worker. O log termina em `celery@... ready`.
4. Frontend.

## 7. Verificação pós-deploy

- `GET https://<backend>/api/v1/health/` responde 200.
- Num shell do serviço backend (terminal do painel, ou `railway shell` com o serviço
  selecionado):

  ```
  python manage.py check_email_pipeline
  ```

  Checa broker, worker respondendo e backend de e-mail. É o único jeito de pegar worker
  ausente: a API responde 200 e o e-mail simplesmente não sai.
- Entrar no `/admin/` com o superusuário. Superusuário conta como coordenador
  (decisions.md §12).
- O processo seletivo já existe em **rascunho**, criado pelo `ensure_selection_process`.
  Conferir etapas e barema. Deploys seguintes nunca o sobrescrevem.
- Fluxo completo com dados reais (fase 10 do roadmap): criar conta de candidato,
  candidatar-se, subir um entregável, baixar como organizador, avaliar, mover de etapa e
  confirmar que o e-mail chegou.
- Subir um arquivo e fazer **redeploy** do backend: o arquivo precisa continuar baixável.
  É a prova de que o volume está montado no caminho certo.
- Só então publicar o processo, pelo botão "Abrir inscrições" na tela do processo.

## 8. Pontos de atenção

- **Backup dos entregáveis** é responsabilidade da Liga. Rodar
  `python manage.py export_deliverables` ao fim de cada etapa e guardar a cópia fora do
  Railway.
- `gunicorn --workers 2` está fixo no `entrypoint.sh`; adequado ao plano básico.
- O logging de produção está em `WARNING`. Para diagnosticar e-mail, olhe o log do
  **worker**, não o do backend.
- Trocar o domínio do frontend mexe em dois lugares: `CORS_ALLOWED_ORIGINS` no backend
  (efeito imediato) e `VITE_API_URL` no frontend (precisa rebuild).
- `SHOW_HACKATHON = false` é código, não variável: a landing publicada é a do seletivo.

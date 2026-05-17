# Design System

## Referência
Baseado no arquivo `DESIGN.md` na raiz do projeto.

## Fontes
- Headings e títulos de destaque: `Clash Display Variable` (classes Tailwind: `font-display`)
- UI / corpo: `IBM Plex Sans` (classes Tailwind: `font-ui`)
- Usar Clash Display nos títulos de páginas, hero, nome da liga e logo.
- Usar IBM Plex Sans em formulários, tabelas, botões e textos corridos.

## Cores — mapeamento para o projeto
Adaptar a paleta do DESIGN.md para o contexto da Liga de TI:
- Brand purple `#7132f5` → cor principal de CTAs e links
- Near black `#101114` → texto primário
- Silver blue `#9497a9` → texto secundário / placeholders
- Green `#149e61` → badge "Aprovada"
- Borders: `#dedee5`

## Logo
O SVG da liga fica em `src/assets/logo.svg`.
Usar no header (todas as páginas) e centralizaado na página de login.

## Componentes obrigatórios a criar em `src/components/ui/`
- `Button` — variantes: primary, outlined, subtle, ghost
- `Badge` — variantes: success (verde), neutral (cinza), pending (roxo sutil)
- `Input` — campo com label flutuante ou estático + mensagem de erro em vermelho

## Regras de aplicação
- Radius de botões: sempre 12px (nunca pill).
- Sombras: apenas whisper — `rgba(0,0,0,0.03) 0px 4px 24px`.
- Não usar outras variações de roxo fora da paleta definida no DESIGN.md.
- Card do líder na RegistrationPage: highlight com borda `#7132f5` e fundo `rgba(133,91,251,0.08)`.
- Status badges: Aprovada → verde, Recusada → cinza, Pendente → roxo sutil.
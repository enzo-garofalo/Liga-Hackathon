"""Primitivas de layout dos e-mails da Liga.

Extraídas de apps/teams/emails.py para que o processo seletivo herde a mesma
identidade visual sem duplicar o HTML. Só o layout mora aqui — o conteúdo de
cada e-mail fica no módulo emails.py do app correspondente.

O HTML é table-based e cheio de redundância de propósito: clientes de e-mail
(Outlook em especial) ignoram boa parte de CSS moderno. Não "limpe" sem testar.
"""

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

FONT = 'Arial, Helvetica, sans-serif'
MONO = "'Courier New', Courier, monospace"

# ── HTML primitives ───────────────────────────────────────────────────────────

def em(text):
    return f'<strong style="font-weight:600;color:#101114;">{text}</strong>'


def p(text):
    return (
        f'<p style="margin:0 0 16px 0;font-family:{FONT};font-size:15px;'
        f'color:#101114;line-height:1.6;">{text}</p>'
    )


def badge(label, bg, color):
    """Badge de status. bg e color são hex sólidos — sem rgba (compatibilidade Outlook)."""
    return (
        f'<table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">'
        f'<tr><td style="padding:6px 14px;background-color:{bg};color:{color};'
        f'border-radius:4px;font-family:{FONT};font-size:12px;font-weight:600;'
        f'text-transform:uppercase;letter-spacing:0.5px;">'
        f'{label}</td></tr>'
        f'</table>'
    )


def info_rows(rows, accent='#7132f5'):
    """Info card com borda esquerda colorida. Espaçamento via padding em <td>, não margin."""
    cells = ''
    for i, (label, value) in enumerate(rows):
        border = 'border-bottom:1px solid #dedee5;' if i < len(rows) - 1 else ''
        cells += (
            f'<tr><td style="padding:8px 0;{border}">'
            f'<span style="display:block;font-family:{FONT};font-size:11px;color:#9497a9;'
            f'text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">{label}</span>'
            f'<strong style="font-family:{FONT};font-size:15px;color:#101114;'
            f'font-weight:600;">{value}</strong>'
            f'</td></tr>'
        )
    # Wrapper table usa padding em <td> para espaçamento — sem margin em <table>
    return (
        f'<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        f'<tr><td style="padding:4px 0 20px 0;">'
        f'<table cellpadding="0" cellspacing="0" border="0" width="100%" '
        f'style="background-color:#f8f8fa;border-left:3px solid {accent};">'
        f'<tr><td style="padding:14px 20px;">'
        f'<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        f'{cells}'
        f'</table>'
        f'</td></tr>'
        f'</table>'
        f'</td></tr>'
        f'</table>'
    )


<<<<<<< HEAD
=======
def button(label, url, color='#7132f5'):
    """Botão de ação. Tabela, e não um <a> com padding: no Outlook o padding do
    link é ignorado e o botão vira texto solto no meio do e-mail.

    O endereço vai também em texto logo abaixo, em quem chama: cliente que
    bloqueia link precisa deixar a pessoa copiar o endereço na mão.
    """
    return (
        f'<table cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;">'
        f'<tr><td align="center" bgcolor="{color}" '
        f'style="background-color:{color};border-radius:4px;">'
        f'<a href="{url}" style="display:inline-block;padding:13px 28px;'
        f'font-family:{FONT};font-size:15px;font-weight:600;color:#ffffff;'
        f'text-decoration:none;">{label}</a>'
        f'</td></tr>'
        f'</table>'
    )


>>>>>>> feature/v3-processo-seletivo
def footnote(text):
    return (
        f'<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        f'<tr><td style="padding-top:16px;border-top:1px solid #dedee5;">'
        f'<span style="font-family:{FONT};font-size:13px;color:#9497a9;line-height:1.5;">'
        f'{text}</span>'
        f'</td></tr>'
        f'</table>'
    )


def base_html(title, preheader, headline, body_html, top_color='#7132f5',
              footer_text='Liga de TI &mdash; Hackathon 2026 &nbsp;&bull;&nbsp; Este é um e-mail automático.'):
    """
    Template base. top_color muda por tipo de e-mail:
      - Convite / info / submetido: #7132f5 (roxo)
      - Aceito / aprovado:          #149e61 (verde)
      - Recusado / encerrado:       #dc2626 (vermelho)

    Compatibilidade:
      - Sem gradient (Outlook não suporta background-image)
      - Largura fixa width="600" para Outlook + max-width CSS para Gmail/Apple Mail
      - bgcolor atributo + background-color inline (dupla garantia)
      - Divisores como rows de 1px em vez de border-bottom em <td>
      - Barra de 4px com height atributo + line-height + font-size (evita Outlook expandir)
    """
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f6;" bgcolor="#f4f4f6">

<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f4f4f6;">{preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f6" style="background-color:#f4f4f6;">
<tr><td align="center" style="padding:40px 16px;">

  <table width="600" cellpadding="0" cellspacing="0" border="0" align="center" bgcolor="#ffffff" style="background-color:#ffffff;max-width:600px;">

    <!-- Barra de cor no topo: solid (sem gradient — Outlook-safe)
         height atributo + line-height + font-size evitam que Outlook expanda célula vazia -->
    <tr>
      <td height="4" bgcolor="{top_color}" style="height:4px;line-height:4px;font-size:4px;background-color:{top_color};">&#8203;</td>
    </tr>

    <!-- Header: logo em texto (não <img>) — evita bloqueio de imagem no Gmail/Outlook -->
    <tr>
      <td bgcolor="#ffffff" style="background-color:#ffffff;padding:28px 40px 24px;">
        <span style="font-family:{MONO};font-size:15px;font-weight:700;color:#7132f5;letter-spacing:3px;text-transform:uppercase;">LIGA DE TI</span>
      </td>
    </tr>

    <!-- Divisor como row separada (mais confiável que border-bottom no <td> em Outlook) -->
    <tr>
      <td height="1" bgcolor="#dedee5" style="height:1px;line-height:1px;font-size:1px;background-color:#dedee5;">&#8203;</td>
    </tr>

    <!-- Corpo -->
    <tr>
      <td bgcolor="#ffffff" style="background-color:#ffffff;padding:32px 40px 36px;">
        <h1 style="margin:0 0 20px 0;font-family:{FONT};font-size:22px;font-weight:700;color:#101114;line-height:1.3;">{headline}</h1>
        {body_html}
      </td>
    </tr>

    <!-- Divisor -->
    <tr>
      <td height="1" bgcolor="#dedee5" style="height:1px;line-height:1px;font-size:1px;background-color:#dedee5;">&#8203;</td>
    </tr>

    <!-- Footer -->
    <tr>
      <td bgcolor="#f8f8fa" style="background-color:#f8f8fa;padding:20px 40px;">
        <span style="font-family:{FONT};font-size:12px;color:#9497a9;line-height:1.5;">{footer_text}</span>
      </td>
    </tr>

  </table>

</td></tr>
</table>

</body>
</html>"""


# ── Email sender ──────────────────────────────────────────────────────────────

def send(subject, text, html, recipients):
    try:
        msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, recipients)
        msg.attach_alternative(html, 'text/html')
        msg.send()
    except Exception:
        logger.exception('Falha ao enviar e-mail "%s" para %s', subject, recipients)

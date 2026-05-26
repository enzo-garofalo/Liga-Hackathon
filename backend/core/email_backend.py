import resend
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend


class ResendEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        resend.api_key = settings.RESEND_API_KEY
        num_sent = 0
        for message in email_messages:
            try:
                params: resend.Emails.SendParams = {
                    "from": message.from_email,
                    "to": list(message.to),
                    "subject": message.subject,
                    "text": message.body,
                }
                if hasattr(message, "alternatives"):
                    for content, mimetype in message.alternatives:
                        if mimetype == "text/html":
                            params["html"] = content
                            break
                if message.cc:
                    params["cc"] = list(message.cc)
                if message.bcc:
                    params["bcc"] = list(message.bcc)
                if message.reply_to:
                    params["reply_to"] = [str(a) for a in message.reply_to]
                resend.Emails.send(params)
                num_sent += 1
            except Exception:
                if not self.fail_silently:
                    raise
        return num_sent

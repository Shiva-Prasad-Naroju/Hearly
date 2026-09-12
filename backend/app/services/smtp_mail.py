from __future__ import annotations

import logging
import re
import smtplib
from email.message import EmailMessage

from app.config import get_settings

logger = logging.getLogger("hearly.mail")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def is_email(value: str | None) -> bool:
    return bool(value and EMAIL_RE.match(value.strip()))


def smtp_ready() -> bool:
    settings = get_settings()
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)


def send_mail(*, to: str, subject: str, body: str, cc: list[str] | None = None) -> None:
    settings = get_settings()
    if not smtp_ready():
        raise RuntimeError("SMTP is not configured. Add SMTP_HOST, SMTP_USER and SMTP_PASSWORD to .env.")

    to_addr = (to or "").strip()
    if not is_email(to_addr):
        raise RuntimeError("Enter a real email address in To before sending.")

    cc_addrs = [c.strip() for c in (cc or []) if is_email(c.strip())]
    sender = (settings.smtp_from or settings.smtp_user).strip()

    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = to_addr
    if cc_addrs:
        msg["Cc"] = ", ".join(cc_addrs)
    msg["Subject"] = (subject or "Follow-up from Hearly").strip()
    msg.set_content((body or "").strip() or "(no body)")

    recipients = [to_addr, *cc_addrs]
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=25) as smtp:
            smtp.ehlo()
            if settings.smtp_use_tls:
                smtp.starttls()
                smtp.ehlo()
            smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg, from_addr=settings.smtp_user, to_addrs=recipients)
    except smtplib.SMTPException as e:
        logger.error("SMTP send failed: %s", e)
        raise RuntimeError(f"Gmail could not send the message: {e}") from e

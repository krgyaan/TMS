# Notifications Module (Global)

Global, **additive** notification layer. New modules that need to send mail (or future WhatsApp) should inject `NotificationsDispatcher` instead of creating their own `*-notification.service.ts`.

## Migration Guide

### Instead of this (duplicated per-module mailer)
```ts
// courier-notification.service.ts — DON'T do this for new notifications
class CourierNotificationService {
  async sendCourierEmail(...) { /* duplicated sendEmail + template wrap */ }
}
```

### Do this (use the global dispatcher)
```ts
@Injectable()
export class SomeService {
  constructor(private readonly notifications: NotificationsDispatcher) {}

  async doSomething() {
    await this.notifications.send({
      channel: 'email',
      domain: 'courier',            // -> emailLogs.referenceType
      referenceId: courier.id,      // -> emailLogs.referenceId (threading)
      eventType: 'courier.created',
      fromUserId: actorId,
      to: [{ type: 'emails', emails: [vendorEmail] }],
      cc: [{ type: 'role', role: 'Admin', teamId }],
      subject: '...',
      template: 'courier/create-courier',
      data: { orderNo, vendor },
      attachments: { files: ['...'], baseDir: '...' },
    });
  }
}
```

## Domains

| `domain` | `referenceType` | Gmail label |
|---|---|---|
| `tender` | `tender` | `Tendering/<team>/<tenderName>` (requires `referenceId` = tender id) |
| `payment_request` | `tender` if `tenderId>0`, else `payment_request` | label for tender-linked, none otherwise |
| `courier`, `followup`, `operation`, `amc`, `crm` | = domain name | **none** (`labelPath=undefined`) |

## Channels

- Phase 1: `channel: 'email'` only. The `EmailNotificationChannel` wraps the consolidated `EmailService.send` core (logging + threading via `email_logs` / `email_threads`).
- `WhatsappNotificationChannel` is a **stub** (no-op). It will be enabled in a later phase; `NotificationRequest.whatsapp` carries the target (`group` / `user` / `group_mention`) for that.

## Dev Override

When `NODE_ENV == 'development'`, the dispatcher redirects **every** outgoing notification:
- Email `From` and `To` are forced to the dev user (default `13`; override via `DEV_OVERRIDE_USER_ID`).
- `Cc` is emptied.
- The original recipients are preserved on the logged `templateData._devOverride` for audits.
- This applies even when `MAIL_MODE=production` or `MAIL_SANDBOX_TO` are set.

## Sender OAuth Fallback

If the requested `fromUserId` has no valid Gmail OAuth, the dispatcher falls back to `FALLBACK_MAIL_USER_ID` (same env var the courier/follow-up modules use).

## Rules for engineers

- **Do not** create new `*-notification.service.ts` files with duplicated `sendEmail`/`SendXxxEmail` wrappers.
- **Do not** remove or modify the existing per-module mail methods (courier, follow-up, payment-requests, etc.) — this layer is additive.
- Reuse `RecipientSource` (`user` / `role` / `emails`) from `@/modules/email/dto/send-email.dto`.

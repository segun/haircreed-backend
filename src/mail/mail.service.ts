import { Injectable } from '@nestjs/common';

export interface MailAttachment {
  content: string;
  filename: string;
  type: string;
  disposition: 'attachment' | 'inline';
}

export interface SendMailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
}

@Injectable()
export class MailService {
  private readonly cloudflareAccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  private readonly cloudflareEmailToken = process.env.CLOUDFLARE_EMAIL_API_TOKEN;
  private readonly mailFrom = process.env.MAIL_FROM;

  async send(payload: SendMailPayload): Promise<void> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/email/sending/send`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.cloudflareEmailToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.mailFrom?.trim(),
        to: payload.to.trim(),
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        ...(payload.attachments?.length ? { attachments: payload.attachments } : {}),
      }),
    });

    const body = (await response.json()) as {
      success: boolean;
      errors: { message: string }[];
      result?: {
        delivered: string[];
        permanent_bounces: string[];
        queued: string[];
      };
    };

    if (!body.success) {
      const detail = body.errors.map((e) => e.message).join('; ');
      throw new Error(`Cloudflare email API error: ${detail}`);
    }

    if (body.result?.permanent_bounces?.length) {
      throw new Error(
        `Email permanently bounced for: ${body.result.permanent_bounces.join(', ')}`,
      );
    }
  }
}

import { Injectable } from '@nestjs/common'

@Injectable()
export class SlackService {
  private webhook = process.env.SLACK_WEBHOOK_URL

  async notify(text: string, blocks?: any[]) {
    if (!this.webhook) return { skipped: true }
    const res = await fetch(this.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blocks ? { text, blocks } : { text }),
    })
    return { ok: res.ok }
  }
}


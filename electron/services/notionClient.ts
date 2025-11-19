import type { SharePayload, ShareResult } from '@shared/types';

export class NotionClient {
  async createPage(payload: SharePayload): Promise<ShareResult> {
    // Exemplo: POST https://api.notion.com/v1/pages com database_id e blocos rich text.
    console.log('[NotionClient] simulando criação de página', JSON.stringify(payload, null, 2));
    return {
      provider: 'notion',
      ok: true,
      message: 'Página criada no Notion (stub)',
      payload
    };
  }
}


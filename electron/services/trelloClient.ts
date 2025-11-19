import type { SharePayload, ShareResult } from '@shared/types';

export class TrelloClient {
  async createCard(payload: SharePayload): Promise<ShareResult> {
    // Exemplo: POST https://api.trello.com/1/cards com key/token/listId.
    console.log('[TrelloClient] simulando criação de card', JSON.stringify(payload, null, 2));
    return {
      provider: 'trello',
      ok: true,
      message: 'Card criado no Trello (stub)',
      payload
    };
  }
}


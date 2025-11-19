import type { TranscriptionSegment } from '@shared/types';
import type { AiTranscriptionService } from '@shared/services/contracts';
import { v4 as uuid } from 'uuid';

export class StubTranscriptionService implements AiTranscriptionService {
  async transcribe(mediaPath: string, language: string): Promise<TranscriptionSegment[]> {
    // Stub simplificado: gera segmentos fictícios para demo e deixa claro onde conectar Whisper/AssemblyAI etc.
    console.log(`Transcrevendo ${mediaPath} com idioma ${language} (stub)`);
    const phrases = [
      'Introdução com contextualização do tema.',
      'Compartilhe a ideia principal em uma frase curta.',
      'Liste duas ou três dicas práticas.',
      'Feche com chamada para ação e agradecimento.'
    ];

    let cursor = 0;
    return phrases.map((text, index) => {
      const start = cursor;
      const duration = 4 + index * 1.5;
      const end = start + duration;
      cursor = end;
      return {
        id: uuid(),
        text,
        start,
        end,
        language
      } as TranscriptionSegment;
    });
  }
}

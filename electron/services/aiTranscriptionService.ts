/**
 * Stub de integração com um serviço de transcrição (ex.: OpenAI Whisper, AssemblyAI, Deepgram).
 * A ideia é manter a interface consistente para trocar por um provider real depois.
 */
export interface AiTranscriptionService {
  startRealtimeSession(): Promise<void>;
  stopSession(): Promise<void>;
}

export class WhisperStubService implements AiTranscriptionService {
  async startRealtimeSession() {
    // Aqui entraria a autenticação e criação de sessão com o provedor externo.
    console.log('Iniciando sessão de transcrição com Whisper (stub)');
  }

  async stopSession() {
    console.log('Encerrando sessão de transcrição (stub)');
  }
}

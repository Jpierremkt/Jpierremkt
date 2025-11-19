import type { BrollSuggestion, ShortSuggestion, TranscriptionSegment, WordTrimRequest } from '../types';

/**
 * Interfaces compartilhadas para IA e integrações externas. Implementações reais
 * podem ser injetadas no processo main sem acoplar a UI.
 */
export interface AiTranscriptionService {
  transcribe(mediaPath: string, language: string): Promise<TranscriptionSegment[]>;
}

export interface EyeContactCorrectionService {
  applyCorrection(videoPath: string): Promise<string>;
}

export interface BrollSuggestionProvider {
  suggest(scriptText: string): Promise<BrollSuggestion[]>;
}

export interface ShortsSuggestionProvider {
  suggestFromTranscript(transcript: TranscriptionSegment[]): Promise<ShortSuggestion[]>;
}

export interface WordTrimEngine {
  generateCutFromText(request: WordTrimRequest): Promise<string>;
}

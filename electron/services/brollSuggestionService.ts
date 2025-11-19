import type { BrollSuggestion } from '@shared/types';
import type { BrollSuggestionProvider } from '@shared/services/contracts';

const LOCAL_BROLL_LIBRARY: { keyword: string; clipPath: string }[] = [
  { keyword: 'dica', clipPath: 'broll/dica.mp4' },
  { keyword: 'atenção', clipPath: 'broll/atencao.mp4' },
  { keyword: 'resumo', clipPath: 'broll/resumo.mp4' },
  { keyword: 'hack', clipPath: 'broll/hack.mp4' }
];

export class BrollSuggestionService implements BrollSuggestionProvider {
  suggest(scriptOrTranscript: string): BrollSuggestion[] {
    const lower = scriptOrTranscript.toLowerCase();
    return LOCAL_BROLL_LIBRARY.filter(({ keyword }) => lower.includes(keyword)).map(({ keyword, clipPath }) => ({
      keyword,
      clipPath,
      confidence: 0.62
    }));
  }
}

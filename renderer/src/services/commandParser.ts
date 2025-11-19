export type CommandAction =
  | 'start'
  | 'pause'
  | 'resume'
  | 'nextParagraph'
  | 'previousParagraph';

export function parseCommand(text: string): CommandAction | null {
  const normalized = text.toLowerCase();
  if (normalized.includes('iniciar teleprompter') || normalized.includes('começar')) return 'start';
  if (normalized.includes('pausar')) return 'pause';
  if (normalized.includes('retomar') || normalized.includes('continuar')) return 'resume';
  if (normalized.includes('próximo parágrafo') || normalized.includes('pular')) return 'nextParagraph';
  if (normalized.includes('voltar um parágrafo') || normalized.includes('parágrafo anterior')) return 'previousParagraph';
  return null;
}

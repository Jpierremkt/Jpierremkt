import type { EyeContactCorrectionService } from '@shared/services/contracts';

export class EyeContactStubService implements EyeContactCorrectionService {
  async applyCorrection(inputPath: string) {
    // Em um provedor real, subiríamos o arquivo para um endpoint de processamento e receberíamos a nova versão.
    const output = inputPath.replace(/(\.[\w]+)?$/, '_eye_contact$1');
    const fs = await import('fs/promises');
    try {
      await fs.copyFile(inputPath, output);
      console.log('Eye contact IA (stub) gerou uma cópia do vídeo.');
      return output;
    } catch (error) {
      console.warn('Falha ao copiar vídeo para correção de eye contact stub', error);
      return inputPath;
    }
  }
}

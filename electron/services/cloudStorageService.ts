export interface CloudStorageService {
  authenticate(): Promise<void>;
  listFiles(): Promise<string[]>;
  downloadFile(fileId: string): Promise<string>;
}

export class GoogleDriveStubService implements CloudStorageService {
  async authenticate() {
    // Em um cenário real, aqui entraria o fluxo OAuth 2.0.
    console.log('Simulando autenticação com Google Drive...');
  }

  async listFiles() {
    return ['roteiro-demo.txt', 'apresentacao.pdf'];
  }

  async downloadFile(fileId: string) {
    console.log(`Download simulado do arquivo ${fileId}`);
    return 'Conteúdo do arquivo baixado via stub';
  }
}

export class OneDriveStubService implements CloudStorageService {
  async authenticate() {
    console.log('Simulando autenticação com OneDrive...');
  }

  async listFiles() {
    return ['campanha.docx', 'roteiro-outubro.txt'];
  }

  async downloadFile(fileId: string) {
    console.log(`Download simulado de ${fileId} (OneDrive stub)`);
    return 'Conteúdo do arquivo OneDrive (stub)';
  }
}

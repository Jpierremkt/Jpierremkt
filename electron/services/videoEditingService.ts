import fs from 'fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import type { ShortSuggestion, TranscriptionSegment, WordTrimRequest } from '@shared/types';
import type { ShortsSuggestionProvider, WordTrimEngine } from '@shared/services/contracts';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as string);
}

export interface WatermarkConfig {
  text?: string;
  imagePath?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface AudioTrackConfig {
  audioPath: string;
  volume: number;
}

export class VideoEditingService implements WordTrimEngine, ShortsSuggestionProvider {
  private outputName(sourcePath: string, suffix: string) {
    const { dir, name, ext } = path.parse(sourcePath);
    return path.join(dir, `${name}_${suffix}${ext || '.mp4'}`);
  }

  async trimByText(request: WordTrimRequest): Promise<string> {
    const output = this.outputName(request.sourcePath, 'wordtrim');
    const firstSegment = request.segments[0];

    // Para demo usamos apenas o primeiro trecho escolhido; em produção concatenaríamos todos com filter_complex.
    if (!firstSegment) {
      await fs.copyFile(request.sourcePath, output);
      return output;
    }

    const start = request.mode === 'keep' ? firstSegment.start : 0;
    const end = request.mode === 'keep' ? firstSegment.end : firstSegment.start;
    const duration = Math.max(0, end - start);

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(request.sourcePath)
          .setStartTime(start)
          .setDuration(duration || 1)
          .outputOptions(['-c:v libx264', '-preset ultrafast'])
          .output(output)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });
      return output;
    } catch (error) {
      console.warn('Falha ao cortar com ffmpeg; copiando arquivo original', error);
      await fs.copyFile(request.sourcePath, output);
      return output;
    }
  }

  async addWatermarkAndAudio(sourcePath: string, watermark?: WatermarkConfig, audio?: AudioTrackConfig): Promise<string> {
    const output = this.outputName(sourcePath, 'mix');
    try {
      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg(sourcePath);

        if (watermark?.text) {
          command.videoFilters(
            `drawtext=text='${watermark.text}':fontcolor=white:fontsize=28:x=10:y=H-th-10:box=1:boxcolor=black@0.35`
          );
        }

        if (watermark?.imagePath) {
          command.input(watermark.imagePath).complexFilter([
            {
              filter: 'overlay',
              options: this.overlayOptions(watermark.position || 'bottom-right')
            }
          ]);
        }

        if (audio?.audioPath) {
          command.input(audio.audioPath).audioFilters(`volume=${audio.volume ?? 1}`);
        }

        command
          .outputOptions(['-preset ultrafast'])
          .save(output)
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });
      return output;
    } catch (error) {
      console.warn('Erro ao aplicar trilha/marca d\'água (stub)', error);
      await fs.copyFile(sourcePath, output);
      return output;
    }
  }

  async exportVerticalClip(sourcePath: string, start: number, end: number): Promise<string> {
    const output = this.outputName(sourcePath, 'vertical');
    const duration = Math.max(0, end - start);
    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(sourcePath)
          .setStartTime(start)
          .setDuration(duration || 15)
          .videoFilters(['scale=1080:-1', 'crop=1080:1920'])
          .outputOptions(['-preset ultrafast'])
          .save(output)
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });
      return output;
    } catch (error) {
      console.warn('Falha ao exportar versão vertical (stub copiando)', error);
      await fs.copyFile(sourcePath, output);
      return output;
    }
  }

  suggestShorts(segments: TranscriptionSegment[]): ShortSuggestion[] {
    const hotWords = ['dica', 'resumo', 'atenção', 'segredo', 'hack'];
    return segments
      .filter((segment) => {
        const duration = segment.end - segment.start;
        const hasHotWord = hotWords.some((word) => segment.text.toLowerCase().includes(word));
        return duration >= 15 && duration <= 60 && hasHotWord;
      })
      .map((segment) => ({
        id: segment.id,
        start: segment.start,
        end: segment.end,
        reason: 'Palavra-chave de destaque e duração ideal',
        aspectRatio: '9:16' as const
      }));
  }

  generateCutFromText(request: WordTrimRequest): Promise<string> {
    return this.trimByText(request);
  }

  suggestFromTranscript(transcript: TranscriptionSegment[]): ShortSuggestion[] {
    return this.suggestShorts(transcript);
  }

  private overlayOptions(position: WatermarkConfig['position']) {
    const positions: Record<Required<WatermarkConfig>['position'], string> = {
      'top-left': '10:10',
      'top-right': 'main_w-overlay_w-10:10',
      'bottom-left': '10:main_h-overlay_h-10',
      'bottom-right': 'main_w-overlay_w-10:main_h-overlay_h-10'
    } as const;
    return positions[position || 'bottom-right'];
  }
}

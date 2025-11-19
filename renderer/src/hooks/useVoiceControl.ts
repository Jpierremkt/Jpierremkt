import { useEffect, useRef, useState } from 'react';
import { parseCommand, CommandAction } from '../services/commandParser';

type RecognitionType = typeof window.SpeechRecognition;

declare global {
  interface Window {
    webkitSpeechRecognition: RecognitionType;
    SpeechRecognition: RecognitionType;
  }
}

export interface VoiceControlOptions {
  onCommand: (command: CommandAction) => void;
  onTranscript: (text: string) => void;
}

export function useVoiceControl({ onCommand, onTranscript }: VoiceControlOptions) {
  const [isListening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const pauseTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ');
      onTranscript(transcript);
      const command = parseCommand(transcript);
      if (command) onCommand(command);

      if (pauseTimeout.current) clearTimeout(pauseTimeout.current);
      pauseTimeout.current = setTimeout(() => onCommand('pause'), 3500);
    };

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [onCommand, onTranscript]);

  const pause = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const resume = () => {
    try {
      recognitionRef.current?.start();
    } catch (error) {
      console.warn('Erro ao retomar reconhecimento', error);
    }
  };

  return { isListening, pause, resume };
}

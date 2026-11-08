import { useCallback, useEffect, useRef, useState } from 'react';

interface RecognitionResultItem {
  transcript: string;
}

interface RecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: RecognitionResultItem;
}

interface RecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: RecognitionResult;
  };
}

interface RecognitionErrorEvent {
  error?: string;
  message?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type RecognitionConstructor = new () => SpeechRecognitionLike;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function describeRecognitionError(code: string | undefined): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was blocked. Allow microphone permission in the browser and try again.';
    case 'audio-capture':
      return 'No microphone was found. Connect a microphone and try again.';
    case 'network':
      return 'Speech recognition needs a network connection in this browser.';
    case 'no-speech':
      return 'No speech was detected. Try again and speak a little closer to the microphone.';
    case 'aborted':
      return '';
    case 'language-not-supported':
      return 'This browser does not support the selected recognition language.';
    default:
      return code ? `Speech recognition stopped: ${code}.` : 'Speech recognition stopped unexpectedly.';
  }
}

export function useSpeechRecognition(language = 'en-US') {
  const [supported] = useState(() => typeof window !== 'undefined' && Boolean(recognitionConstructor()));
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef<((text: string) => void) | null>(null);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.stop();
    } catch {
      // The recognition may already be stopped.
    }
    recognitionRef.current = null;
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback(
    (onFinal: (text: string) => void) => {
      setError(null);
      const Constructor = recognitionConstructor();
      if (!Constructor) {
        setError('Speech recognition is unavailable. Use Chrome, Edge or Safari over HTTPS or localhost.');
        return;
      }

      const recognition = new Constructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;
      onFinalRef.current = onFinal;

      recognition.onstart = () => {
        setListening(true);
        setError(null);
      };

      recognition.onresult = event => {
        let finalText = '';
        let interimText = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const text = result[0]?.transcript ?? '';
          if (result.isFinal) finalText += text;
          else interimText += text;
        }
        setInterim(interimText);
        if (finalText.trim()) {
          setInterim('');
          onFinalRef.current?.(finalText.trim());
        }
      };

      recognition.onerror = event => {
        const message = describeRecognitionError(event.error);
        if (message) setError(message);
        setListening(false);
        setInterim('');
      };

      recognition.onend = () => {
        setListening(false);
        setInterim('');
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        setError('The microphone could not be started. Close other recording tabs and try again.');
        setListening(false);
      }
    },
    [language],
  );

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    },
    [],
  );

  return { supported, listening, interim, error, start, stop, clearError: () => setError(null) };
}

import { useEffect, useRef } from 'react';

export function useIsMounted() {
  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  return () => isMounted.current;
}

// Phase 5 voice hooks
export { useSpeechRecognition } from './use-speech-recognition';
export type { UseSpeechRecognitionOptions, UseSpeechRecognitionReturn } from './use-speech-recognition';
export { useTTS } from './use-tts';
export type { UseTTSOptions, UseTTSReturn } from './use-tts';


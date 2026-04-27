import React, { useState, useRef, useEffect, useCallback } from 'react';

interface AudioPlayerProps {
  base64Audio: string;
  topic: string;
}

// Helper to decode base64 string to Uint8Array
const decodeBase64ToBytes = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Helper to decode raw PCM to AudioBuffer
const decodePCMToAudioBuffer = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ base64Audio, topic }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // Initialize audio buffer once when base64Audio changes
  useEffect(() => {
    let isMounted = true;
    
    const initAudio = async () => {
      if (!base64Audio) return;
      
      try {
        setIsReady(false);
        // Create context only after user interaction ideally, but we prepare the buffer first.
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass({ sampleRate: 24000 });
        audioContextRef.current = ctx;

        const bytes = decodeBase64ToBytes(base64Audio);
        const buffer = await decodePCMToAudioBuffer(bytes, ctx, 24000, 1);
        
        if (isMounted) {
          audioBufferRef.current = buffer;
          setIsReady(true);
        }
      } catch (err) {
        console.error("Audio initialization error:", err);
        if (isMounted) setError("Failed to decode audio.");
      }
    };

    initAudio();

    return () => {
      isMounted = false;
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
         audioContextRef.current.close();
      }
    };
  }, [base64Audio]);

  const togglePlay = useCallback(async () => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    // Browser might suspend audio context until user interaction
    if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
    }

    if (isPlaying) {
      // Stop playing
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Start playing
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      
      // Connect to output
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 1.0;
      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        sourceNodeRef.current = null;
      };

      source.start(0);
      sourceNodeRef.current = source;
      setIsPlaying(true);
    }
  }, [isPlaying]);

  if (error) {
    return <div className="text-red-500 text-sm p-4 bg-red-50 rounded-lg">{error}</div>;
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center space-x-4">
        <button
          onClick={togglePlay}
          disabled={!isReady}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
            !isReady 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : isPlaying 
                ? 'bg-primary-100 text-primary-700 hover:bg-primary-200' 
                : 'bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
          }`}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
          {isPlaying ? (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
               <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </button>
        <div>
          <p className="text-sm font-medium text-gray-900">Audio Summary</p>
          <p className="text-xs text-gray-500">{isReady ? `Listen to a quick overview of ${topic}` : 'Preparing audio...'}</p>
        </div>
      </div>
      
      {/* Fake sound wave animation when playing */}
      <div className="flex items-end space-x-1 h-8 px-4 opacity-70">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div 
            key={i} 
            className={`w-1.5 rounded-full ${isPlaying ? 'bg-primary-500 animate-pulse' : 'bg-gray-200 h-1'}`}
            style={{ 
              height: isPlaying ? `${Math.max(20, Math.random() * 100)}%` : '4px',
              animationDuration: `${0.5 + Math.random() * 0.5}s`,
              animationDelay: `${Math.random() * 0.5}s`
            }}
          ></div>
        ))}
      </div>
    </div>
  );
};
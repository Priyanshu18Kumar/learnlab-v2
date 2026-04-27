import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

// --- Audio Encoding & Decoding Helpers ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodePCMToAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): any {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

interface LiveTutorProps {
  onClose: () => void;
  topicContext?: string;
}

export const LiveTutor: React.FC<LiveTutorProps> = ({ onClose, topicContext }) => {
  const [status, setStatus] = useState<'connecting' | 'listening' | 'speaking' | 'error'>('connecting');
  const [transcript, setTranscript] = useState<string>('Connecting to your personal AI tutor...');
  
  const audioContextRef = useRef<{ input?: AudioContext; output?: AudioContext }>({});
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    let isMounted = true;
    let nextStartTime = 0;
    let currentInputTranscription = '';
    let currentOutputTranscription = '';

    const initLiveSession = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isMounted) return;
        streamRef.current = stream;

        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = { input: inputAudioContext, output: outputAudioContext };

        const outputNode = outputAudioContext.createGain();
        outputNode.connect(outputAudioContext.destination);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: `You are LearnLab AI, an encouraging and expert live voice tutor for a student. Keep answers concise, clear, and conversational. ${topicContext ? `The student is currently looking at this topic: "${topicContext}".` : ''}`,
            outputAudioTranscription: {},
            inputAudioTranscription: {},
          },
          callbacks: {
            onopen: () => {
              if (!isMounted) return;
              setStatus('listening');
              setTranscript("Hi! I'm ready. What would you like to learn about?");

              const source = inputAudioContext.createMediaStreamSource(stream);
              const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContext.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (!isMounted) return;

              // Handle Transcriptions
              if (message.serverContent?.outputTranscription) {
                currentOutputTranscription += message.serverContent.outputTranscription.text;
                setStatus('speaking');
                setTranscript(currentOutputTranscription);
              } else if (message.serverContent?.inputTranscription) {
                currentInputTranscription += message.serverContent.inputTranscription.text;
                setStatus('listening');
                setTranscript(currentInputTranscription);
              }

              if (message.serverContent?.turnComplete) {
                currentInputTranscription = '';
                currentOutputTranscription = '';
                setStatus('listening');
              }

              // Handle Audio Output
              const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64EncodedAudioString) {
                nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                const audioBuffer = await decodePCMToAudioBuffer(
                  decode(base64EncodedAudioString),
                  outputAudioContext,
                  24000,
                  1,
                );
                
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                
                source.addEventListener('ended', () => {
                  sourcesRef.current.delete(source);
                });

                source.start(nextStartTime);
                nextStartTime = nextStartTime + audioBuffer.duration;
                sourcesRef.current.add(source);
              }

              // Handle Interruptions
              if (message.serverContent?.interrupted) {
                for (const source of sourcesRef.current.values()) {
                  source.stop();
                  sourcesRef.current.delete(source);
                }
                nextStartTime = 0;
                setStatus('listening');
              }
            },
            onerror: (e) => {
              console.error('Live API Error:', e);
              if (isMounted) {
                setStatus('error');
                setTranscript('Connection error. Please try again.');
              }
            },
            onclose: () => {
              console.log('Live session closed');
            },
          }
        });

        sessionRef.current = sessionPromise;

      } catch (err) {
        console.error("Failed to start Live Tutor:", err);
        if (isMounted) {
          setStatus('error');
          setTranscript('Could not access microphone or connect to AI.');
        }
      }
    };

    initLiveSession();

    return () => {
      isMounted = false;
      if (sessionRef.current) {
        sessionRef.current.then((s: any) => s.close());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current.input) audioContextRef.current.input.close();
      if (audioContextRef.current.output) audioContextRef.current.output.close();
      for (const source of sourcesRef.current.values()) {
        source.stop();
      }
    };
  }, [topicContext]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-[fadeIn_0.3s_ease-out]">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden relative border border-slate-100 flex flex-col items-center p-10 text-center">
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none"></div>
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <h3 className="text-2xl font-black text-slate-800 tracking-tight z-10 mb-8">Live Voice Tutor</h3>

        {/* Dynamic Visualizer */}
        <div className="relative w-32 h-32 flex items-center justify-center mb-8 z-10">
          {status === 'speaking' && (
            <>
               <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-75"></div>
               <div className="absolute inset-2 rounded-full bg-blue-200 animate-pulse"></div>
            </>
          )}
          {status === 'listening' && (
            <div className="absolute inset-4 rounded-full border-4 border-blue-100 animate-[spin_4s_linear_infinite] border-t-blue-500"></div>
          )}
          
          <div className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors duration-500 ${
            status === 'connecting' ? 'bg-slate-200' :
            status === 'error' ? 'bg-red-100 text-red-500' :
            status === 'speaking' ? 'bg-blue-600 text-white shadow-blue-500/50' :
            'bg-white text-blue-600 border-2 border-blue-100'
          }`}>
            {status === 'error' ? (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : status === 'speaking' ? (
               <svg className="w-8 h-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
            ) : (
               <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            )}
          </div>
        </div>

        {/* Status Text & Transcript */}
        <div className="z-10 min-h-[4rem] w-full flex flex-col items-center justify-center mb-8">
           <span className={`text-xs font-bold uppercase tracking-widest mb-2 ${
             status === 'error' ? 'text-red-500' : 
             status === 'speaking' ? 'text-blue-600' : 
             'text-slate-400'
           }`}>
             {status === 'connecting' ? 'Establishing Connection...' : status}
           </span>
           <p className="text-slate-700 text-lg font-medium italic max-w-sm line-clamp-3 leading-snug">
              "{transcript}"
           </p>
        </div>

        {/* Controls */}
        <button 
          onClick={onClose}
          className="z-10 px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold transition-colors shadow-sm"
        >
          End Session
        </button>

      </div>
    </div>
  );
};

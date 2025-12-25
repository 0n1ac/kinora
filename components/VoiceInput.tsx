"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import styles from './VoiceInput.module.css';

export type SttMode = 'web-speech' | 'whisper';

interface VoiceInputProps {
    onTranscript?: (transcript: string) => void;
    onAutoSend?: (transcript: string) => void;
    autoSendEnabled?: boolean;
    onRecordingChange?: (isRecording: boolean) => void;
    sttMode?: SttMode;
}

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

export default function VoiceInput({
    onTranscript,
    onAutoSend,
    autoSendEnabled = true,
    onRecordingChange,
    sttMode = 'web-speech'
}: VoiceInputProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const [silenceProgress, setSilenceProgress] = useState(0);

    // Web Speech API refs
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const accumulatedTranscriptRef = useRef<string>('');
    const shouldAutoSendRef = useRef<boolean>(false);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Whisper/MediaRecorder refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    // Use refs for callbacks to avoid re-creating the recognition on every render
    const onTranscriptRef = useRef(onTranscript);
    const onAutoSendRef = useRef(onAutoSend);
    const onRecordingChangeRef = useRef(onRecordingChange);

    // Silence detection timer
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const autoSendEnabledRef = useRef(autoSendEnabled);
    const sttModeRef = useRef(sttMode);
    const SILENCE_TIMEOUT = 1500; // 1.5 seconds of silence triggers auto-send
    const PROGRESS_INTERVAL = 50; // Update progress every 50ms for smooth animation

    // Keep refs up to date
    useEffect(() => {
        onTranscriptRef.current = onTranscript;
        onAutoSendRef.current = onAutoSend;
        onRecordingChangeRef.current = onRecordingChange;
        autoSendEnabledRef.current = autoSendEnabled;
        sttModeRef.current = sttMode;
    }, [onTranscript, onAutoSend, onRecordingChange, autoSendEnabled, sttMode]);

    // Notify parent when recording state changes
    useEffect(() => {
        if (onRecordingChangeRef.current) {
            onRecordingChangeRef.current(isRecording);
        }
    }, [isRecording]);

    // Clear timers on unmount
    useEffect(() => {
        return () => {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Initialize Web Speech API
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            if (sttMode === 'web-speech') {
                setIsSupported(false);
            }
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 3;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';

            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
            setSilenceProgress(0);

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                }
            }

            if (finalTranscript) {
                accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? ' ' : '') + finalTranscript;
                if (onTranscriptRef.current) {
                    onTranscriptRef.current(finalTranscript);
                }

                if (autoSendEnabledRef.current) {
                    const startTime = Date.now();
                    setSilenceProgress(0);

                    if (progressIntervalRef.current) {
                        clearInterval(progressIntervalRef.current);
                    }

                    progressIntervalRef.current = setInterval(() => {
                        const elapsed = Date.now() - startTime;
                        const progress = Math.min((elapsed / SILENCE_TIMEOUT) * 100, 100);
                        setSilenceProgress(progress);
                    }, PROGRESS_INTERVAL);

                    silenceTimerRef.current = setTimeout(() => {
                        if (progressIntervalRef.current) {
                            clearInterval(progressIntervalRef.current);
                            progressIntervalRef.current = null;
                        }
                        setSilenceProgress(0);

                        if (recognitionRef.current && accumulatedTranscriptRef.current.trim()) {
                            const transcript = accumulatedTranscriptRef.current.trim();
                            recognitionRef.current.stop();

                            if (onAutoSendRef.current) {
                                setTimeout(() => {
                                    if (onAutoSendRef.current) {
                                        onAutoSendRef.current(transcript);
                                    }
                                }, 50);
                            }
                            accumulatedTranscriptRef.current = '';
                        }
                    }, SILENCE_TIMEOUT);
                }
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
            setSilenceProgress(0);
            if (event.error === 'aborted') {
                return;
            }
            console.error('Speech recognition error:', event.error);
            setIsRecording(false);
            accumulatedTranscriptRef.current = '';
        };

        recognition.onend = () => {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
            setSilenceProgress(0);
            setIsRecording(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    // Convert audio blob to 16kHz Float32Array for Whisper
    const convertAudioForWhisper = useCallback(async (audioBlob: Blob): Promise<Float32Array> => {
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get the first channel (mono)
        const channelData = audioBuffer.getChannelData(0);

        // If already 16kHz, return as is
        if (audioBuffer.sampleRate === 16000) {
            await audioContext.close();
            return channelData;
        }

        // Resample to 16kHz
        const offlineContext = new OfflineAudioContext(1, audioBuffer.duration * 16000, 16000);
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start();

        const resampledBuffer = await offlineContext.startRendering();
        await audioContext.close();

        return resampledBuffer.getChannelData(0);
    }, []);

    // Whisper mode: send audio to API for transcription
    const transcribeWithWhisper = useCallback(async (audioBlob: Blob) => {
        setIsProcessing(true);
        try {
            // Convert audio to Float32Array for Whisper
            const audioData = await convertAudioForWhisper(audioBlob);

            // Send as JSON with Float32Array data
            const response = await fetch('/api/stt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    audio: Array.from(audioData), // Convert to regular array for JSON
                }),
            });

            if (!response.ok) {
                throw new Error('Transcription failed');
            }

            const data = await response.json();
            const transcript = data.transcript?.trim();

            if (transcript) {
                if (onTranscriptRef.current) {
                    onTranscriptRef.current(transcript);
                }
                if (onAutoSendRef.current) {
                    onAutoSendRef.current(transcript);
                }
            }
        } catch (error) {
            console.error('Whisper transcription error:', error);
            alert('Failed to transcribe audio. Make sure the Whisper model is properly set up.');
        } finally {
            setIsProcessing(false);
        }
    }, [convertAudioForWhisper]);

    // Start recording with MediaRecorder (for Whisper mode)
    const startWhisperRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
            });

            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];

                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }

                await transcribeWithWhisper(audioBlob);
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Failed to access microphone. Please ensure microphone permissions are granted.');
        }
    }, [transcribeWithWhisper]);

    // Stop recording with MediaRecorder (for Whisper mode)
    const stopWhisperRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, []);

    // Start recording with Web Speech API
    const startWebSpeechRecording = useCallback(() => {
        if (!recognitionRef.current) {
            alert('Speech recognition is not supported in your browser. Please use Chrome.');
            return;
        }

        accumulatedTranscriptRef.current = '';
        shouldAutoSendRef.current = false;
        try {
            recognitionRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Failed to start recognition:', error);
        }
    }, []);

    // Stop recording with Web Speech API
    const stopWebSpeechRecording = useCallback(() => {
        if (!recognitionRef.current) return;

        const transcript = accumulatedTranscriptRef.current.trim();
        recognitionRef.current.stop();

        if (transcript && onAutoSendRef.current) {
            setTimeout(() => {
                if (onAutoSendRef.current) {
                    onAutoSendRef.current(transcript);
                }
            }, 50);
        }
    }, []);

    const toggleRecording = useCallback(() => {
        if (isProcessing) return;

        if (sttModeRef.current === 'whisper') {
            if (isRecording) {
                stopWhisperRecording();
            } else {
                startWhisperRecording();
            }
        } else {
            if (!isSupported) {
                alert('Speech recognition is not supported in your browser. Please use Chrome.');
                return;
            }
            if (isRecording) {
                stopWebSpeechRecording();
            } else {
                startWebSpeechRecording();
            }
        }
    }, [isRecording, isSupported, isProcessing, startWhisperRecording, stopWhisperRecording, startWebSpeechRecording, stopWebSpeechRecording]);

    // Calculate SVG circle properties for progress ring
    const circleRadius = 26;
    const circleCircumference = 2 * Math.PI * circleRadius;
    const strokeDashoffset = circleCircumference - (silenceProgress / 100) * circleCircumference;

    // Whisper mode doesn't need isSupported check since it uses MediaRecorder
    const isDisabled = sttMode === 'web-speech' ? !isSupported : false;

    return (
        <div className={styles.container}>
            <div className={styles.buttonWrapper}>
                {/* Progress ring SVG - only for Web Speech mode */}
                {isRecording && autoSendEnabled && sttMode === 'web-speech' && (
                    <svg className={styles.progressRing} viewBox="0 0 60 60">
                        <circle
                            className={styles.progressRingBg}
                            cx="30"
                            cy="30"
                            r={circleRadius}
                            fill="none"
                            strokeWidth="3"
                        />
                        <circle
                            className={styles.progressRingFill}
                            cx="30"
                            cy="30"
                            r={circleRadius}
                            fill="none"
                            strokeWidth="3"
                            strokeDasharray={circleCircumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                        />
                    </svg>
                )}
                <button
                    type="button"
                    className={`${styles.button} ${isRecording ? styles.recording : ''} ${isProcessing ? styles.processing : ''}`}
                    onClick={toggleRecording}
                    aria-label={isProcessing ? "Processing" : isRecording ? "Stop recording" : "Start recording"}
                    disabled={isDisabled || isProcessing}
                    title={isDisabled ? "Speech recognition not supported" : isProcessing ? "Processing audio..." : undefined}
                >
                    {isProcessing ? (
                        <Loader2 size={22} className={styles.spinner} />
                    ) : isRecording ? (
                        <MicOff size={22} />
                    ) : (
                        <Mic size={22} />
                    )}
                </button>
            </div>
            {!isSupported && sttMode === 'web-speech' && (
                <p className={styles.unsupported}>Speech not supported</p>
            )}
        </div>
    );
}

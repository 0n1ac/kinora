"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import styles from './VoiceInput.module.css';

interface VoiceInputProps {
    onTranscript?: (transcript: string) => void;
    onAutoSend?: (transcript: string) => void;
    autoSendEnabled?: boolean;
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

export default function VoiceInput({ onTranscript, onAutoSend, autoSendEnabled = true }: VoiceInputProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const accumulatedTranscriptRef = useRef<string>('');
    const shouldAutoSendRef = useRef<boolean>(false);

    // Use refs for callbacks to avoid re-creating the recognition on every render
    const onTranscriptRef = useRef(onTranscript);
    const onAutoSendRef = useRef(onAutoSend);

    // Silence detection timer
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const autoSendEnabledRef = useRef(autoSendEnabled);
    const SILENCE_TIMEOUT = 1500; // 1.5 seconds of silence triggers auto-send

    // Keep refs up to date
    useEffect(() => {
        onTranscriptRef.current = onTranscript;
        onAutoSendRef.current = onAutoSend;
        autoSendEnabledRef.current = autoSendEnabled;
    }, [onTranscript, onAutoSend, autoSendEnabled]);

    // Clear silence timer on unmount
    useEffect(() => {
        return () => {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        // Check if Speech Recognition is supported
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Keep listening
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // Default to English

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';

            // Clear any existing silence timer when we get new results
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }

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

                // Only start silence detection timer if auto-send is enabled
                // If no new speech for SILENCE_TIMEOUT, auto-stop and send
                if (autoSendEnabledRef.current) {
                    silenceTimerRef.current = setTimeout(() => {
                        if (recognitionRef.current && accumulatedTranscriptRef.current.trim()) {
                            const transcript = accumulatedTranscriptRef.current.trim();
                            recognitionRef.current.stop();

                            // Auto-send the transcript
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
            // Clear silence timer on error
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
            // Ignore 'aborted' errors as they're expected when stopping
            if (event.error === 'aborted') {
                return;
            }
            console.error('Speech recognition error:', event.error);
            setIsRecording(false);
            accumulatedTranscriptRef.current = '';
        };

        recognition.onend = () => {
            // Clear silence timer
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
            setIsRecording(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []); // Empty dependency array - only run once

    const toggleRecording = useCallback(() => {
        if (!isSupported || !recognitionRef.current) {
            alert('Speech recognition is not supported in your browser. Please use Chrome.');
            return;
        }

        if (isRecording) {
            // Capture the transcript BEFORE stopping
            const transcript = accumulatedTranscriptRef.current.trim();

            // Stop the recognition
            recognitionRef.current.stop();

            // Auto-send if there's a transcript
            if (transcript && onAutoSend) {
                // Use setTimeout to ensure UI updates first
                setTimeout(() => {
                    onAutoSend(transcript);
                }, 50);
            }
        } else {
            // Reset accumulated transcript when starting new recording
            accumulatedTranscriptRef.current = '';
            shouldAutoSendRef.current = false;
            try {
                recognitionRef.current.start();
                setIsRecording(true);
            } catch (error) {
                console.error('Failed to start recognition:', error);
            }
        }
    }, [isSupported, isRecording, onAutoSend]);

    return (
        <div className={styles.container}>
            <button
                type="button"
                className={`${styles.button} ${isRecording ? styles.recording : ''}`}
                onClick={toggleRecording}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
                disabled={!isSupported}
                title={!isSupported ? "Speech recognition not supported" : undefined}
            >
                {isRecording ? (
                    <MicOff size={22} />
                ) : (
                    <Mic size={22} />
                )}
            </button>
            {!isSupported && (
                <p className={styles.unsupported}>Speech not supported</p>
            )}
        </div>
    );
}


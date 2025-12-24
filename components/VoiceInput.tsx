"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import styles from './VoiceInput.module.css';

interface VoiceInputProps {
    onTranscript?: (transcript: string) => void;
    onAutoSend?: (transcript: string) => void;
    autoSendEnabled?: boolean;
    onRecordingChange?: (isRecording: boolean) => void;
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

export default function VoiceInput({ onTranscript, onAutoSend, autoSendEnabled = true, onRecordingChange }: VoiceInputProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const [silenceProgress, setSilenceProgress] = useState(0);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const accumulatedTranscriptRef = useRef<string>('');
    const shouldAutoSendRef = useRef<boolean>(false);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Use refs for callbacks to avoid re-creating the recognition on every render
    const onTranscriptRef = useRef(onTranscript);
    const onAutoSendRef = useRef(onAutoSend);
    const onRecordingChangeRef = useRef(onRecordingChange);

    // Silence detection timer
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const autoSendEnabledRef = useRef(autoSendEnabled);
    const SILENCE_TIMEOUT = 1500; // 1.5 seconds of silence triggers auto-send
    const PROGRESS_INTERVAL = 50; // Update progress every 50ms for smooth animation

    // Keep refs up to date
    useEffect(() => {
        onTranscriptRef.current = onTranscript;
        onAutoSendRef.current = onAutoSend;
        onRecordingChangeRef.current = onRecordingChange;
        autoSendEnabledRef.current = autoSendEnabled;
    }, [onTranscript, onAutoSend, onRecordingChange, autoSendEnabled]);

    // Notify parent when recording state changes
    useEffect(() => {
        if (onRecordingChangeRef.current) {
            onRecordingChangeRef.current(isRecording);
        }
    }, [isRecording]);

    // Clear silence timer and progress interval on unmount
    useEffect(() => {
        return () => {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, []);

    // Helper function to start progress animation
    const startProgressAnimation = useCallback(() => {
        setSilenceProgress(0);
        const startTime = Date.now();

        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }

        progressIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / SILENCE_TIMEOUT) * 100, 100);
            setSilenceProgress(progress);

            if (progress >= 100) {
                if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                    progressIntervalRef.current = null;
                }
            }
        }, PROGRESS_INTERVAL);
    }, [SILENCE_TIMEOUT]);

    // Helper function to stop progress animation
    const stopProgressAnimation = useCallback(() => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
        setSilenceProgress(0);
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

            // Clear any existing silence timer and progress when we get new results
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

                // Only start silence detection timer if auto-send is enabled
                // If no new speech for SILENCE_TIMEOUT, auto-stop and send
                if (autoSendEnabledRef.current) {
                    // Start progress animation
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
                        // Stop progress animation
                        if (progressIntervalRef.current) {
                            clearInterval(progressIntervalRef.current);
                            progressIntervalRef.current = null;
                        }
                        setSilenceProgress(0);

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
            // Clear silence timer and progress on error
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
            setSilenceProgress(0);
            // Ignore 'aborted' errors as they're expected when stopping
            if (event.error === 'aborted') {
                return;
            }
            console.error('Speech recognition error:', event.error);
            setIsRecording(false);
            accumulatedTranscriptRef.current = '';
        };

        recognition.onend = () => {
            // Clear silence timer and progress
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

    // Calculate SVG circle properties for progress ring
    const circleRadius = 26;
    const circleCircumference = 2 * Math.PI * circleRadius;
    const strokeDashoffset = circleCircumference - (silenceProgress / 100) * circleCircumference;

    return (
        <div className={styles.container}>
            <div className={styles.buttonWrapper}>
                {/* Progress ring SVG */}
                {isRecording && autoSendEnabled && (
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
            </div>
            {!isSupported && (
                <p className={styles.unsupported}>Speech not supported</p>
            )}
        </div>
    );
}


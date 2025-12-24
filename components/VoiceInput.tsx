"use client";
import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import styles from './VoiceInput.module.css';

interface VoiceInputProps {
    onTranscript?: (transcript: string) => void;
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

export default function VoiceInput({ onTranscript }: VoiceInputProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        // Check if Speech Recognition is supported
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // Default to English

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                }
            }

            if (finalTranscript && onTranscript) {
                onTranscript(finalTranscript);
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [onTranscript]);

    const toggleRecording = () => {
        if (!isSupported || !recognitionRef.current) {
            alert('Speech recognition is not supported in your browser. Please use Chrome.');
            return;
        }

        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        } else {
            try {
                recognitionRef.current.start();
                setIsRecording(true);
            } catch (error) {
                console.error('Failed to start recognition:', error);
            }
        }
    };

    return (
        <div className={styles.container}>
            <button
                className={`${styles.button} ${isRecording ? styles.recording : ''}`}
                onClick={toggleRecording}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
                disabled={!isSupported}
                title={!isSupported ? "Speech recognition not supported" : undefined}
            >
                {isRecording ? (
                    <MicOff size={28} />
                ) : (
                    <Mic size={28} />
                )}
            </button>
            {!isSupported && (
                <p className={styles.unsupported}>Speech not supported</p>
            )}
        </div>
    );
}

"use client";
import { useState, useEffect, useRef } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import styles from './ChatMessage.module.css';

interface ChatMessageProps {
    role: 'user' | 'assistant';
    content: string;
    autoSpeak?: boolean;
    isFirstAssistantMessage?: boolean;
    hasUserInteracted?: boolean;
    onUserInteraction?: () => void;
    onSpeakComplete?: () => void;
}

export default function ChatMessage({
    role,
    content,
    autoSpeak = false,
    isFirstAssistantMessage = false,
    hasUserInteracted = false,
    onUserInteraction,
    onSpeakComplete
}: ChatMessageProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
    const [showHint, setShowHint] = useState(isFirstAssistantMessage && !hasUserInteracted);
    const hasAutoSpoken = useRef(false);
    const lastContentLength = useRef(0);

    const handleSpeak = async () => {
        // Mark that user has interacted
        if (onUserInteraction) {
            onUserInteraction();
        }

        // Hide hint after clicking
        setShowHint(false);

        // If already playing, stop it
        if (isPlaying && audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0;
            setIsPlaying(false);
            return;
        }

        if (!content.trim()) return;

        setIsPlaying(true);

        try {
            // Fetch audio from Edge TTS API
            const response = await fetch(`/api/tts?text=${encodeURIComponent(content)}`);

            if (!response.ok) {
                throw new Error('Failed to fetch TTS audio');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            const audio = new Audio(audioUrl);
            setAudioElement(audio);

            audio.onended = () => {
                setIsPlaying(false);
                URL.revokeObjectURL(audioUrl);
                onSpeakComplete?.();
            };

            audio.onerror = () => {
                setIsPlaying(false);
                URL.revokeObjectURL(audioUrl);
            };

            await audio.play();
        } catch (error) {
            console.error('TTS error:', error);

            // Fallback to Web Speech API
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(content);
                utterance.lang = 'en-US';
                utterance.rate = 0.9;
                utterance.onend = () => {
                    setIsPlaying(false);
                    onSpeakComplete?.();
                };
                utterance.onerror = () => {
                    setIsPlaying(false);
                };
                window.speechSynthesis.speak(utterance);
            } else {
                setIsPlaying(false);
            }
        }
    };

    // Auto-speak only if user has already interacted (not first message)
    useEffect(() => {
        if (role !== 'assistant' || !autoSpeak || hasAutoSpoken.current) return;

        // Don't auto-speak if user hasn't interacted yet (first message)
        if (!hasUserInteracted) return;

        // Check if content has stopped growing (streaming complete)
        const contentLength = content.length;

        // Use a timeout to detect when streaming has stopped
        const timeoutId = setTimeout(() => {
            if (content.length === contentLength && contentLength > 0 && !hasAutoSpoken.current) {
                hasAutoSpoken.current = true;
                handleSpeak();
            }
        }, 500);

        lastContentLength.current = contentLength;

        return () => clearTimeout(timeoutId);
    }, [content, role, autoSpeak, hasUserInteracted]);

    return (
        <div className={`${styles.message} ${styles[role]}`}>
            <div className={styles.bubble}>
                <p className={styles.content}>{content}</p>
                {role === 'assistant' && (
                    <div className={styles.speakArea}>
                        {showHint && (
                            <button
                                onClick={handleSpeak}
                                className={styles.hintBtn}
                            >
                                <Volume2 size={14} />
                                <span>Click to hear voice</span>
                            </button>
                        )}
                        {!showHint && (
                            <button
                                onClick={handleSpeak}
                                className={styles.speakBtn}
                                aria-label={isPlaying ? "Stop" : "Read aloud"}
                                title={isPlaying ? "Stop" : "Read aloud"}
                                disabled={isPlaying && !audioElement}
                            >
                                {isPlaying ? <Loader2 size={16} className={styles.spinning} /> : <Volume2 size={16} />}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

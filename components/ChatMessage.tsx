"use client";
import { useState } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import styles from './ChatMessage.module.css';

interface ChatMessageProps {
    role: 'user' | 'assistant';
    content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

    const handleSpeak = async () => {
        // If already playing, stop it
        if (isPlaying && audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0;
            setIsPlaying(false);
            return;
        }

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
            };

            audio.onerror = () => {
                setIsPlaying(false);
                URL.revokeObjectURL(audioUrl);
            };

            await audio.play();
        } catch (error) {
            console.error('TTS error:', error);
            setIsPlaying(false);

            // Fallback to Web Speech API if Edge TTS fails
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(content);
                utterance.lang = 'en-US';
                utterance.rate = 0.9;
                utterance.onend = () => setIsPlaying(false);
                window.speechSynthesis.speak(utterance);
            }
        }
    };

    return (
        <div className={`${styles.message} ${styles[role]}`}>
            <div className={styles.bubble}>
                <p className={styles.content}>{content}</p>
                {role === 'assistant' && (
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
        </div>
    );
}

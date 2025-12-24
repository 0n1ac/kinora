"use client";
import { Volume2 } from 'lucide-react';
import styles from './MessageDisplay.module.css';

interface MessageDisplayProps {
    text: string;
}

export default function MessageDisplay({ text }: MessageDisplayProps) {
    if (!text) return null;

    const handleSpeak = () => {
        if ('speechSynthesis' in window) {
            // Basic TTS implementation
            window.speechSynthesis.cancel(); // Stop previous
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US'; // Default to English
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    };

    return (
        <div className={styles.container}>
            <p className={styles.text}>{text}</p>
            <div className={styles.actions}>
                <button
                    onClick={handleSpeak}
                    className={styles.iconBtn}
                    aria-label="Read aloud"
                    title="Read aloud"
                >
                    <Volume2 size={20} />
                </button>
            </div>
        </div>
    );
}

"use client";
import { Volume2 } from 'lucide-react';
import styles from './ChatMessage.module.css';

interface ChatMessageProps {
    role: 'user' | 'assistant';
    content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
    const handleSpeak = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(content);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
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
                        aria-label="Read aloud"
                        title="Read aloud"
                    >
                        <Volume2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}

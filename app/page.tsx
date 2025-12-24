"use client";
import { useState } from 'react';
import styles from './page.module.css';
import VoiceInput from '@/components/VoiceInput';
import MessageDisplay from '@/components/MessageDisplay';

export default function Home() {
  const [response, setResponse] = useState<string>("");

  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Kinora</h1>
        <p className={styles.subtitle}>
          Master fluency with AI-driven conversations.
        </p>
      </div>

      <div className={styles.interactionArea}>
        <VoiceInput />

        <div className={styles.inputWrapper}>
          <textarea
            className={styles.textArea}
            placeholder="Type your message or speak above..."
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Simulating a response for demonstration
                setResponse("Hello! I am Kinora. I can help you practice your pronunciation and conversation skills. Try speaking to me or typing another message.");
              }
            }}
          />
        </div>

        <MessageDisplay text={response} />
      </div>
    </main>
  );
}

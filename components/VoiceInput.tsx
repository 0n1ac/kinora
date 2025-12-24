"use client";
import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import styles from './VoiceInput.module.css';

export default function VoiceInput() {
    const [isRecording, setIsRecording] = useState(false);

    const toggleRecording = () => {
        setIsRecording(!isRecording);
        // Placeholder for recording logic
        console.log(isRecording ? "Stopped recording" : "Started recording");
    };

    return (
        <div className={styles.container}>
            <button
                className={`${styles.button} ${isRecording ? styles.recording : ''}`}
                onClick={toggleRecording}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
                {isRecording ? (
                    <MicOff size={28} className="text-white" />
                ) : (
                    <Mic size={28} />
                )}
            </button>
        </div>
    );
}

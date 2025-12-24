"use client";
import { useState } from 'react';
import { Settings as SettingsIcon, X } from 'lucide-react';
import styles from './Settings.module.css';

interface SettingsProps {
    autoSendEnabled: boolean;
    onAutoSendChange: (enabled: boolean) => void;
    selectedVoice: string;
    onVoiceChange: (voice: string) => void;
    speechRate: number;
    onSpeechRateChange: (rate: number) => void;
    speechPitch: number;
    onSpeechPitchChange: (pitch: number) => void;
}

const VOICE_OPTIONS = [
    { value: 'en-US-JennyNeural', label: 'Jenny (US)' },
    { value: 'en-US-AnaNeural', label: 'Ana (US)' },
    { value: 'en-US-AriaNeural', label: 'Aria (US)' },
    { value: 'en-US-MichelleNeural', label: 'Michelle (US)' },
    { value: 'en-US-AvaNeural', label: 'Ava (US)' },
];

export default function Settings({
    autoSendEnabled,
    onAutoSendChange,
    selectedVoice,
    onVoiceChange,
    speechRate,
    onSpeechRateChange,
    speechPitch,
    onSpeechPitchChange
}: SettingsProps) {
    const [isOpen, setIsOpen] = useState(false);

    const formatRate = (rate: number) => {
        if (rate === 0) return 'Normal';
        return rate > 0 ? `+${rate}%` : `${rate}%`;
    };

    const formatPitch = (pitch: number) => {
        if (pitch === 0) return 'Normal';
        return pitch > 0 ? `+${pitch}Hz` : `${pitch}Hz`;
    };

    return (
        <>
            {/* Floating trigger button - always visible on the right edge */}
            <button
                className={styles.trigger}
                onClick={() => setIsOpen(true)}
                type="button"
                aria-label="Open settings"
            >
                <SettingsIcon size={20} />
            </button>

            {/* Overlay backdrop */}
            <div
                className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
                onClick={() => setIsOpen(false)}
            />

            {/* Slide-out panel */}
            <div className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
                <div className={styles.panelHeader}>
                    <h2 className={styles.panelTitle}>Settings</h2>
                    <button
                        className={styles.closeButton}
                        onClick={() => setIsOpen(false)}
                        type="button"
                        aria-label="Close settings"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.panelContent}>
                    <div className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>Auto-send voice</span>
                            <span className={styles.settingDescription}>
                                Automatically send message after you stop speaking
                            </span>
                        </div>
                        <button
                            type="button"
                            className={`${styles.toggle} ${autoSendEnabled ? styles.toggleOn : ''}`}
                            onClick={() => onAutoSendChange(!autoSendEnabled)}
                            aria-label={autoSendEnabled ? "Disable auto-send" : "Enable auto-send"}
                        >
                            <span className={styles.toggleKnob} />
                        </button>
                    </div>

                    <div className={styles.settingsDivider} />

                    <div className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>TTS Voice</span>
                            <span className={styles.settingDescription}>
                                Choose the voice for text-to-speech
                            </span>
                        </div>
                        <div className={styles.selectWrapper}>
                            <select
                                className={styles.select}
                                value={selectedVoice}
                                onChange={(e) => onVoiceChange(e.target.value)}
                            >
                                {VOICE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.settingsDivider} />

                    <div className={styles.settingItemVertical}>
                        <div className={styles.sliderWrapper}>
                            <div className={styles.sliderHeader}>
                                <div className={styles.settingInfo}>
                                    <span className={styles.settingLabel}>Speech Rate</span>
                                    <span className={styles.settingDescription}>
                                        Adjust how fast the voice speaks
                                    </span>
                                </div>
                                <span className={styles.sliderValue}>{formatRate(speechRate)}</span>
                            </div>
                            <input
                                type="range"
                                className={styles.slider}
                                min="-50"
                                max="100"
                                step="10"
                                value={speechRate}
                                onChange={(e) => onSpeechRateChange(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className={styles.settingsDivider} />

                    <div className={styles.settingItemVertical}>
                        <div className={styles.sliderWrapper}>
                            <div className={styles.sliderHeader}>
                                <div className={styles.settingInfo}>
                                    <span className={styles.settingLabel}>Speech Pitch</span>
                                    <span className={styles.settingDescription}>
                                        Adjust the pitch of the voice
                                    </span>
                                </div>
                                <span className={styles.sliderValue}>{formatPitch(speechPitch)}</span>
                            </div>
                            <input
                                type="range"
                                className={styles.slider}
                                min="-50"
                                max="50"
                                step="5"
                                value={speechPitch}
                                onChange={(e) => onSpeechPitchChange(Number(e.target.value))}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

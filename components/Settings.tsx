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
    targetLanguage: string;
    onTargetLanguageChange: (language: string) => void;
    nativeLanguage: string;
    onNativeLanguageChange: (language: string) => void;
    autoHideContent: boolean;
    onAutoHideContentChange: (enabled: boolean) => void;
    sttMode: string;
    onSttModeChange: (mode: string) => void;
}

const VOICE_OPTIONS = [
    { value: 'en-US-JennyNeural', label: 'Jenny (US)' },
    { value: 'en-US-AnaNeural', label: 'Ana (US)' },
    { value: 'en-US-AriaNeural', label: 'Aria (US)' },
    { value: 'en-US-MichelleNeural', label: 'Michelle (US)' },
    { value: 'en-US-AvaNeural', label: 'Ava (US)' },
];

const LANGUAGE_OPTIONS = [
    { value: 'English', label: 'English' },
    { value: 'Korean', label: '한국어' },
    { value: 'Japanese', label: '日本語' },
    { value: 'Spanish', label: 'Español' },
    { value: 'French', label: 'Français' },
    { value: 'German', label: 'Deutsch' },
    { value: 'Chinese', label: '中文' },
];

const STT_OPTIONS = [
    { value: 'web-speech', label: 'Web Speech (Real-time)' },
    { value: 'whisper', label: 'Whisper (Accurate)' },
];

export default function Settings({
    autoSendEnabled,
    onAutoSendChange,
    selectedVoice,
    onVoiceChange,
    speechRate,
    onSpeechRateChange,
    speechPitch,
    onSpeechPitchChange,
    targetLanguage,
    onTargetLanguageChange,
    nativeLanguage,
    onNativeLanguageChange,
    autoHideContent,
    onAutoHideContentChange,
    sttMode,
    onSttModeChange
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
                    {/* Conversation Settings */}
                    <h3 className={styles.categoryTitle}>Conversation</h3>

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

                    <div className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>Auto-hide answers</span>
                            <span className={styles.settingDescription}>
                                Hide chat content until tapped
                            </span>
                        </div>
                        <button
                            type="button"
                            className={`${styles.toggle} ${autoHideContent ? styles.toggleOn : ''}`}
                            onClick={() => onAutoHideContentChange(!autoHideContent)}
                            aria-label={autoHideContent ? "Disable auto-hide" : "Enable auto-hide"}
                        >
                            <span className={styles.toggleKnob} />
                        </button>
                    </div>

                    {/* Language Settings */}
                    <h3 className={styles.categoryTitle}>Language</h3>

                    <div className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>Target Language</span>
                            <span className={styles.settingDescription}>
                                The language you want to learn
                            </span>
                        </div>
                        <div className={styles.selectWrapper}>
                            <select
                                className={styles.select}
                                value={targetLanguage}
                                onChange={(e) => onTargetLanguageChange(e.target.value)}
                            >
                                {LANGUAGE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>Native Language</span>
                            <span className={styles.settingDescription}>
                                Your native language for comments
                            </span>
                        </div>
                        <div className={styles.selectWrapper}>
                            <select
                                className={styles.select}
                                value={nativeLanguage}
                                onChange={(e) => onNativeLanguageChange(e.target.value)}
                            >
                                {LANGUAGE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Voice Settings */}
                    <h3 className={styles.categoryTitle}>Voice</h3>

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

                    <div className={styles.settingItem}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>Speech Recognition</span>
                            <span className={styles.settingDescription}>
                                Choose speech-to-text engine
                            </span>
                        </div>
                        <div className={styles.selectWrapper}>
                            <select
                                className={styles.select}
                                value={sttMode}
                                onChange={(e) => onSttModeChange(e.target.value)}
                            >
                                {STT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

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

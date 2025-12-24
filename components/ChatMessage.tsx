"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Volume2, Loader2, MessageCircle, ChevronDown } from 'lucide-react';
import styles from './ChatMessage.module.css';

interface ChatMessageProps {
    role: 'user' | 'assistant';
    content: string;
    autoSpeak?: boolean;
    isFirstAssistantMessage?: boolean;
    hasUserInteracted?: boolean;
    onUserInteraction?: () => void;
    onSpeakComplete?: () => void;
    selectedVoice?: string;
    speechRate?: number;
    speechPitch?: number;
    autoHideContent?: boolean;
}

interface ParsedResponse {
    answer: string;
    comments: string | null;
}

function parseAssistantContent(content: string): ParsedResponse {
    try {
        // Try to parse as JSON
        const parsed = JSON.parse(content);
        if (parsed.Answer) {
            return {
                answer: parsed.Answer,
                comments: parsed.Comments || null
            };
        }
    } catch {
        // Not valid JSON, return as-is
    }
    return { answer: content, comments: null };
}

export default function ChatMessage({
    role,
    content,
    autoSpeak = false,
    isFirstAssistantMessage = false,
    hasUserInteracted = false,
    onUserInteraction,
    onSpeakComplete,
    selectedVoice = 'en-US-JennyNeural',
    speechRate = 0,
    speechPitch = 0,
    autoHideContent = true
}: ChatMessageProps) {
    // Parse content for assistant messages
    const parsedContent = useMemo(() => {
        if (role === 'assistant') {
            return parseAssistantContent(content);
        }
        return { answer: content, comments: null };
    }, [content, role]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
    const [showHint, setShowHint] = useState(isFirstAssistantMessage && !hasUserInteracted);
    const [isExpanded, setIsExpanded] = useState(!autoHideContent); // Use autoHideContent setting
    const hasAutoSpoken = useRef(false);
    const isSpeakingRef = useRef(false); // Ref to prevent race conditions

    // Toggle content visibility
    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    const handleSpeak = useCallback(async () => {
        // Prevent multiple simultaneous speak calls (race condition guard)
        if (isSpeakingRef.current) return;

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
            isSpeakingRef.current = false;
            return;
        }

        const textToSpeak = parsedContent.answer;
        if (!textToSpeak.trim()) return;

        // Set speaking flag immediately to prevent race conditions
        isSpeakingRef.current = true;
        setIsPlaying(true);

        try {
            // Fetch audio from Edge TTS API with selected voice, rate and pitch
            const params = new URLSearchParams({
                text: textToSpeak,
                voice: selectedVoice,
                rate: speechRate.toString(),
                pitch: speechPitch.toString()
            });
            const response = await fetch(`/api/tts?${params.toString()}`);

            if (!response.ok) {
                throw new Error('Failed to fetch TTS audio');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            const audio = new Audio(audioUrl);
            setAudioElement(audio);

            audio.onended = () => {
                setIsPlaying(false);
                isSpeakingRef.current = false;
                URL.revokeObjectURL(audioUrl);
                onSpeakComplete?.();
            };

            audio.onerror = () => {
                setIsPlaying(false);
                isSpeakingRef.current = false;
                URL.revokeObjectURL(audioUrl);
            };

            await audio.play();
        } catch (error) {
            console.error('TTS error:', error);

            // Fallback to Web Speech API
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(textToSpeak);
                utterance.lang = 'en-US';
                utterance.rate = 0.9;
                utterance.onend = () => {
                    setIsPlaying(false);
                    isSpeakingRef.current = false;
                    onSpeakComplete?.();
                };
                utterance.onerror = () => {
                    setIsPlaying(false);
                    isSpeakingRef.current = false;
                };
                window.speechSynthesis.speak(utterance);
            } else {
                setIsPlaying(false);
                isSpeakingRef.current = false;
            }
        }
    }, [parsedContent.answer, isPlaying, audioElement, onUserInteraction, onSpeakComplete, selectedVoice, speechRate, speechPitch]);

    // Auto-speak only if user has already interacted (not first message)
    useEffect(() => {
        if (role !== 'assistant' || !autoSpeak || hasAutoSpoken.current) return;

        // Don't auto-speak if user hasn't interacted yet (first message)
        if (!hasUserInteracted) return;

        // Check if content has stopped growing (streaming complete)
        const contentLength = content.length;

        // Use a timeout to detect when streaming has stopped
        const timeoutId = setTimeout(() => {
            // Check hasAutoSpoken again and set it BEFORE calling handleSpeak
            if (content.length === contentLength && contentLength > 0 && !hasAutoSpoken.current) {
                hasAutoSpoken.current = true; // Set before calling to prevent race conditions
                handleSpeak();
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [content, role, autoSpeak, hasUserInteracted, handleSpeak]);

    return (
        <div className={`${styles.message} ${styles[role]}`}>
            <div
                className={`${styles.bubble} ${role === 'assistant' ? styles.clickableBubble : ''}`}
                onClick={role === 'assistant' ? toggleExpanded : undefined}
            >
                {role === 'assistant' ? (
                    // Collapsible content for assistant messages
                    <>
                        <div className={styles.collapsedPreview}>
                            <span className={styles.tapHint}>
                                {isExpanded ? 'Tap to hide' : 'Tap to reveal'}
                            </span>
                            <ChevronDown
                                size={16}
                                className={`${styles.chevron} ${isExpanded ? styles.chevronUp : ''}`}
                            />
                        </div>
                        <div className={`${styles.expandableContent} ${isExpanded ? styles.expanded : styles.collapsed}`}>
                            <p className={styles.content}>
                                {parsedContent.answer}
                            </p>
                            {parsedContent.comments && (
                                <div className={styles.commentsSection}>
                                    <div className={styles.commentsHeader}>
                                        <MessageCircle size={14} />
                                        <span>Tips</span>
                                    </div>
                                    <p className={styles.commentsText}>{parsedContent.comments}</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <p className={styles.content}>{content}</p>
                )}
                {role === 'assistant' && (
                    <div className={styles.speakArea}>
                        {showHint && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSpeak();
                                }}
                                className={styles.hintBtn}
                            >
                                <Volume2 size={14} />
                                <span>Click to hear voice</span>
                            </button>
                        )}
                        {!showHint && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSpeak();
                                }}
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

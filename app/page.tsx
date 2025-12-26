"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './page.module.css';
import VoiceInput, { SttMode } from '@/components/VoiceInput';
import ChatMessage from '@/components/ChatMessage';
import Settings from '@/components/Settings';
import ChatHistory from '@/components/ChatHistory';
import {
  KinoraSettings,
  Persona,
  Conversation,
  Message,
  DEFAULT_SETTINGS,
  DEFAULT_PERSONA,
  saveSettings,
  loadSettings,
  savePersona,
  loadPersona,
  getConversationList,
  saveConversation,
  loadConversation,
  deleteConversation,
  renameConversation,
  createConversation,
  generateConversationTitle,
  getCurrentConversationId,
  setCurrentConversationId,
} from '@/lib/storage';

export default function Home() {
  // Initialize with defaults, will be overwritten on mount
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUserInteractedWithTTS, setHasUserInteractedWithTTS] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Settings state
  const [autoSendEnabled, setAutoSendEnabled] = useState(DEFAULT_SETTINGS.autoSendEnabled);
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_SETTINGS.selectedVoice);
  const [speechRate, setSpeechRate] = useState(DEFAULT_SETTINGS.speechRate);
  const [speechPitch, setSpeechPitch] = useState(DEFAULT_SETTINGS.speechPitch);
  const [targetLanguage, setTargetLanguage] = useState(DEFAULT_SETTINGS.targetLanguage);
  const [nativeLanguage, setNativeLanguage] = useState(DEFAULT_SETTINGS.nativeLanguage);
  const [autoHideContent, setAutoHideContent] = useState(DEFAULT_SETTINGS.autoHideContent);
  const [sttMode, setSttMode] = useState<SttMode>(DEFAULT_SETTINGS.sttMode as SttMode);
  const [whisperModel, setWhisperModel] = useState(DEFAULT_SETTINGS.whisperModel);

  // Persona state
  const [persona, setPersona] = useState<Persona>(DEFAULT_PERSONA);

  // Conversation state
  const [currentConversationId, setCurrentConversationIdState] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Global audio management - stop any playing audio when new one starts
  const currentPlayingAudioRef = useRef<{ stop: () => void } | null>(null);

  const stopCurrentAudio = useCallback(() => {
    if (currentPlayingAudioRef.current) {
      currentPlayingAudioRef.current.stop();
      currentPlayingAudioRef.current = null;
    }
  }, []);

  const registerPlayingAudio = useCallback((stopFn: () => void) => {
    stopCurrentAudio();
    currentPlayingAudioRef.current = { stop: stopFn };
  }, [stopCurrentAudio]);

  const unregisterPlayingAudio = useCallback(() => {
    currentPlayingAudioRef.current = null;
  }, []);

  // Load data from localStorage on mount
  useEffect(() => {
    const settings = loadSettings();
    setAutoSendEnabled(settings.autoSendEnabled);
    setSelectedVoice(settings.selectedVoice);
    setSpeechRate(settings.speechRate);
    setSpeechPitch(settings.speechPitch);
    setTargetLanguage(settings.targetLanguage);
    setNativeLanguage(settings.nativeLanguage);
    setAutoHideContent(settings.autoHideContent);
    setSttMode(settings.sttMode as SttMode);
    setWhisperModel(settings.whisperModel);

    setPersona(loadPersona());
    setConversations(getConversationList());

    // Load current conversation
    const currentId = getCurrentConversationId();
    if (currentId) {
      const conv = loadConversation(currentId);
      if (conv) {
        setCurrentConversationIdState(currentId);
        setMessages(conv.messages);
      }
    }

    setIsInitialized(true);
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    if (!isInitialized) return;

    const settings: KinoraSettings = {
      autoSendEnabled,
      selectedVoice,
      speechRate,
      speechPitch,
      targetLanguage,
      nativeLanguage,
      autoHideContent,
      sttMode,
      whisperModel,
    };
    saveSettings(settings);
  }, [
    isInitialized,
    autoSendEnabled,
    selectedVoice,
    speechRate,
    speechPitch,
    targetLanguage,
    nativeLanguage,
    autoHideContent,
    sttMode,
    whisperModel,
  ]);

  // Save persona whenever it changes
  useEffect(() => {
    if (!isInitialized) return;
    savePersona(persona);
  }, [isInitialized, persona]);

  // Save current conversation whenever messages change
  const saveCurrentConversation = useCallback((msgs: Message[], convId: string | null) => {
    if (!isInitialized || !convId) return;

    const existingConv = loadConversation(convId);
    const title = msgs.length > 0 ? generateConversationTitle(msgs) : 'New Conversation';

    const conversation: Conversation = {
      id: convId,
      title,
      messages: msgs,
      createdAt: existingConv?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    saveConversation(conversation);
    setConversations(getConversationList());
  }, [isInitialized]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start a new conversation
  const startNewConversation = useCallback(() => {
    const newConv = createConversation();
    setCurrentConversationIdState(newConv.id);
    setCurrentConversationId(newConv.id);
    setMessages([]);
    setInput("");
    setIsLoading(false);
    setHasUserInteractedWithTTS(false);
    saveConversation(newConv);
    setConversations(getConversationList());
  }, []);

  // Reset session - clear current and start new
  const resetSession = () => {
    startNewConversation();
  };

  // Switch to a different conversation
  const handleSelectConversation = (id: string) => {
    const conv = loadConversation(id);
    if (conv) {
      setCurrentConversationIdState(id);
      setCurrentConversationId(id);
      setMessages(conv.messages);
      setInput("");
      setIsLoading(false);
      setHasUserInteractedWithTTS(false); // Reset to prevent auto-play of last message
    }
  };

  // Delete a conversation
  const handleDeleteConversation = (id: string) => {
    deleteConversation(id);
    setConversations(getConversationList());

    // If deleting current conversation, start a new one
    if (id === currentConversationId) {
      startNewConversation();
    }
  };

  // Rename a conversation
  const handleRenameConversation = (id: string, newTitle: string) => {
    renameConversation(id, newTitle);
    setConversations(getConversationList());
  };

  // Handle clear all data
  const handleClearAllData = () => {
    setMessages([]);
    setInput("");
    setPersona(DEFAULT_PERSONA);
    setConversations([]);
    setCurrentConversationIdState(null);
    setAutoSendEnabled(DEFAULT_SETTINGS.autoSendEnabled);
    setSelectedVoice(DEFAULT_SETTINGS.selectedVoice);
    setSpeechRate(DEFAULT_SETTINGS.speechRate);
    setSpeechPitch(DEFAULT_SETTINGS.speechPitch);
    setTargetLanguage(DEFAULT_SETTINGS.targetLanguage);
    setNativeLanguage(DEFAULT_SETTINGS.nativeLanguage);
    setAutoHideContent(DEFAULT_SETTINGS.autoHideContent);
    setSttMode(DEFAULT_SETTINGS.sttMode as SttMode);
    setWhisperModel(DEFAULT_SETTINGS.whisperModel);
  };

  const handleTranscript = (transcript: string) => {
    setInput(prev => prev + (prev ? ' ' : '') + transcript);
  };

  const handleTTSInteraction = () => {
    setHasUserInteractedWithTTS(true);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Ensure we have a conversation
    let convId = currentConversationId;
    if (!convId) {
      const newConv = createConversation();
      convId = newConv.id;
      setCurrentConversationIdState(convId);
      setCurrentConversationId(convId);
      saveConversation(newConv);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Save immediately after user message
    saveCurrentConversation(newMessages, convId);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          targetLanguage,
          nativeLanguage,
          persona
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: ''
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage.content += chunk;
        setMessages(prev =>
          prev.map(m => m.id === assistantMessage.id ? { ...m, content: assistantMessage.content } : m)
        );
      }

      // Save after assistant response
      const finalMessages = [...newMessages, assistantMessage];
      saveCurrentConversation(finalMessages, convId);

    } catch (error) {
      console.error('Chat error:', error);
      const demoResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '{"Answer": "Hello! I\'m Kinora, your language learning companion. I\'m here to help you practice conversations and improve your fluency. What would you like to talk about today?", "Comments": "Let\'s start our conversation!"}'
      };
      const finalMessages = [...newMessages, demoResponse];
      setMessages(finalMessages);
      saveCurrentConversation(finalMessages, convId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Find the first assistant message index
  const firstAssistantIndex = messages.findIndex(m => m.role === 'assistant');
  const hasConversation = messages.length > 0;

  // Don't render until initialized to avoid hydration mismatch
  if (!isInitialized) {
    return (
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>Kinora</h1>
          <p className={styles.subtitle}>Master fluency with AI-driven conversations.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={`${styles.hero} ${hasConversation ? styles.heroActive : ''}`}>
        <h1
          className={`${styles.title} ${hasConversation ? styles.titleClickable : ''}`}
          onClick={hasConversation ? resetSession : undefined}
          style={hasConversation ? { cursor: 'pointer' } : undefined}
          title={hasConversation ? 'Click to start new session' : undefined}
        >
          Kinora
        </h1>
        <p className={styles.subtitle}>
          Master fluency with AI-driven conversations.
        </p>
      </div>

      <ChatHistory
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewChat={startNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
      />

      <Settings
        autoSendEnabled={autoSendEnabled}
        onAutoSendChange={setAutoSendEnabled}
        selectedVoice={selectedVoice}
        onVoiceChange={setSelectedVoice}
        speechRate={speechRate}
        onSpeechRateChange={setSpeechRate}
        speechPitch={speechPitch}
        onSpeechPitchChange={setSpeechPitch}
        targetLanguage={targetLanguage}
        onTargetLanguageChange={setTargetLanguage}
        nativeLanguage={nativeLanguage}
        onNativeLanguageChange={setNativeLanguage}
        autoHideContent={autoHideContent}
        onAutoHideContentChange={setAutoHideContent}
        sttMode={sttMode}
        onSttModeChange={(mode) => setSttMode(mode as SttMode)}
        whisperModel={whisperModel}
        onWhisperModelChange={setWhisperModel}
        persona={persona}
        onPersonaChange={setPersona}
        onClearAllData={handleClearAllData}
      />

      <div className={styles.interactionArea}>
        {/* Conversation Display */}
        {messages.length > 0 && (
          <div className={styles.messagesContainer}>
            {messages.map((message, index) => {
              const isLastAssistantMessage =
                message.role === 'assistant' &&
                index === messages.length - 1 &&
                !isLoading;

              const isFirstAssistant = index === firstAssistantIndex;

              return (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  autoSpeak={isLastAssistantMessage}
                  isFirstAssistantMessage={isFirstAssistant}
                  hasUserInteracted={hasUserInteractedWithTTS}
                  onUserInteraction={handleTTSInteraction}
                  selectedVoice={selectedVoice}
                  speechRate={speechRate}
                  speechPitch={speechPitch}
                  autoHideContent={autoHideContent}
                  onRegisterAudio={registerPlayingAudio}
                  onUnregisterAudio={unregisterPlayingAudio}
                />
              );
            })}
            {isLoading && (
              <div className={styles.typingIndicator}>
                <span></span><span></span><span></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <form className={`${styles.inputWrapper} ${hasConversation ? styles.inputActive : ''} ${isVoiceRecording ? styles.inputRecording : ''}`} onSubmit={handleSubmit}>
          <textarea
            className={styles.textArea}
            placeholder="Type your message or use voice..."
            spellCheck={false}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
          />
          <VoiceInput
            onTranscript={handleTranscript}
            onAutoSend={sendMessage}
            autoSendEnabled={autoSendEnabled}
            onRecordingChange={setIsVoiceRecording}
            sttMode={sttMode}
            whisperModel={whisperModel}
          />
        </form>
      </div>
    </main>
  );
}

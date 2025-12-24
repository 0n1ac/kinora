"use client";
import { useState, useRef, useEffect } from 'react';
import styles from './page.module.css';
import VoiceInput from '@/components/VoiceInput';
import ChatMessage from '@/components/ChatMessage';
import Settings from '@/components/Settings';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUserInteractedWithTTS, setHasUserInteractedWithTTS] = useState(false);
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('en-US-JennyNeural');
  const [speechRate, setSpeechRate] = useState(0);
  const [speechPitch, setSpeechPitch] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTranscript = (transcript: string) => {
    setInput(prev => prev + (prev ? ' ' : '') + transcript);
  };

  const handleTTSInteraction = () => {
    setHasUserInteractedWithTTS(true);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
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
    } catch (error) {
      console.error('Chat error:', error);
      // Fallback demo response when API is not available
      const demoResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Hello! I'm Kinora, your language learning companion. I'm here to help you practice conversations and improve your fluency. What would you like to talk about today?"
      };
      setMessages(prev => [...prev, demoResponse]);
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

  return (
    <main className={styles.main}>
      <div className={`${styles.hero} ${hasConversation ? styles.heroActive : ''}`}>
        <h1 className={styles.title}>Kinora</h1>
        <p className={styles.subtitle}>
          Master fluency with AI-driven conversations.
        </p>
      </div>

      <Settings
        autoSendEnabled={autoSendEnabled}
        onAutoSendChange={setAutoSendEnabled}
        selectedVoice={selectedVoice}
        onVoiceChange={setSelectedVoice}
        speechRate={speechRate}
        onSpeechRateChange={setSpeechRate}
        speechPitch={speechPitch}
        onSpeechPitchChange={setSpeechPitch}
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

        <form className={`${styles.inputWrapper} ${hasConversation ? styles.inputActive : ''}`} onSubmit={handleSubmit}>
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
          />
        </form>
      </div>
    </main>
  );
}

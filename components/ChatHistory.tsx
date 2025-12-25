"use client";
import { useState } from 'react';
import { MessageSquare, Plus, X, Trash2 } from 'lucide-react';
import { Conversation } from '@/lib/storage';
import styles from './ChatHistory.module.css';

interface ChatHistoryProps {
    conversations: Conversation[];
    currentConversationId: string | null;
    onNewChat: () => void;
    onSelectConversation: (id: string) => void;
    onDeleteConversation: (id: string) => void;
}

export default function ChatHistory({
    conversations,
    currentConversationId,
    onNewChat,
    onSelectConversation,
    onDeleteConversation,
}: ChatHistoryProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const handleSelectConversation = (id: string) => {
        onSelectConversation(id);
        setIsOpen(false);
    };

    const handleNewChat = () => {
        onNewChat();
        setIsOpen(false);
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeleteConfirmId(id);
    };

    const handleDeleteConfirm = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onDeleteConversation(id);
        setDeleteConfirmId(null);
    };

    const handleDeleteCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteConfirmId(null);
    };

    const formatDate = (timestamp: number): string => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return date.toLocaleDateString([], { weekday: 'long' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    // Only count conversations with messages
    const conversationCount = conversations.filter(c => c.messages.length > 0).length;

    return (
        <>
            {/* Floating trigger button */}
            <button
                className={styles.trigger}
                onClick={() => setIsOpen(true)}
                type="button"
                aria-label="Open chat history"
            >
                <MessageSquare size={20} />
                {conversationCount > 0 && (
                    <span className={styles.badge}>{conversationCount}</span>
                )}
            </button>

            {/* Overlay backdrop */}
            <div
                className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
                onClick={() => setIsOpen(false)}
            />

            {/* Slide-out panel */}
            <div className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
                <div className={styles.panelHeader}>
                    <h2 className={styles.panelTitle}>Conversations</h2>
                    <button
                        className={styles.closeButton}
                        onClick={() => setIsOpen(false)}
                        type="button"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                <button
                    className={styles.newChatButton}
                    onClick={handleNewChat}
                    type="button"
                >
                    <Plus size={18} />
                    New Conversation
                </button>

                <div className={styles.conversationList}>
                    {conversations.length === 0 ? (
                        <div className={styles.emptyState}>
                            <MessageSquare size={40} />
                            <span>No conversations yet.<br />Start a new one!</span>
                        </div>
                    ) : (
                        conversations
                            .filter(c => c.messages.length > 0)
                            .map((conversation) => (
                                <div
                                    key={conversation.id}
                                    className={`${styles.conversationItem} ${currentConversationId === conversation.id ? styles.active : ''
                                        }`}
                                    onClick={() => handleSelectConversation(conversation.id)}
                                >
                                    <div className={styles.conversationContent}>
                                        <div className={styles.conversationTitle}>
                                            {conversation.title}
                                        </div>
                                        <div className={styles.conversationDate}>
                                            {formatDate(conversation.updatedAt)}
                                        </div>
                                    </div>

                                    {deleteConfirmId === conversation.id ? (
                                        <div className={styles.deleteConfirm}>
                                            <button
                                                className={`${styles.confirmButton} ${styles.confirmYes}`}
                                                onClick={(e) => handleDeleteConfirm(e, conversation.id)}
                                            >
                                                Delete
                                            </button>
                                            <button
                                                className={`${styles.confirmButton} ${styles.confirmNo}`}
                                                onClick={handleDeleteCancel}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            className={styles.deleteButton}
                                            onClick={(e) => handleDeleteClick(e, conversation.id)}
                                            aria-label="Delete conversation"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))
                    )}
                </div>
            </div>
        </>
    );
}

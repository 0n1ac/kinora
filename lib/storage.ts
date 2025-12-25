// LocalStorage utility for Kinora
// Handles settings, persona, and conversation persistence

const STORAGE_KEYS = {
    SETTINGS: 'kinora-settings',
    PERSONA: 'kinora-persona',
    CONVERSATIONS: 'kinora-conversations',
    CURRENT_CONVERSATION: 'kinora-current-conversation',
} as const;

// Types
export interface KinoraSettings {
    autoSendEnabled: boolean;
    selectedVoice: string;
    speechRate: number;
    speechPitch: number;
    targetLanguage: string;
    nativeLanguage: string;
    autoHideContent: boolean;
    sttMode: string;
    whisperModel: string;
}

export interface Persona {
    name: string;
    learningGoals: string;
    proficiencyLevel: 'beginner' | 'intermediate' | 'advanced';
    customContext: string;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
}

// Default values
export const DEFAULT_SETTINGS: KinoraSettings = {
    autoSendEnabled: true,
    selectedVoice: 'en-US-JennyNeural',
    speechRate: 0,
    speechPitch: 0,
    targetLanguage: 'English',
    nativeLanguage: 'Korean',
    autoHideContent: true,
    sttMode: 'web-speech',
    whisperModel: 'small',
};

export const DEFAULT_PERSONA: Persona = {
    name: '',
    learningGoals: '',
    proficiencyLevel: 'beginner',
    customContext: '',
};

// Storage check helper
const isLocalStorageAvailable = (): boolean => {
    try {
        const testKey = '__kinora_test__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
};

// Settings
export const saveSettings = (settings: KinoraSettings): void => {
    if (!isLocalStorageAvailable()) return;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

export const loadSettings = (): KinoraSettings => {
    if (!isLocalStorageAvailable()) return DEFAULT_SETTINGS;
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (!stored) return DEFAULT_SETTINGS;
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
        return DEFAULT_SETTINGS;
    }
};

// Persona
export const savePersona = (persona: Persona): void => {
    if (!isLocalStorageAvailable()) return;
    localStorage.setItem(STORAGE_KEYS.PERSONA, JSON.stringify(persona));
};

export const loadPersona = (): Persona => {
    if (!isLocalStorageAvailable()) return DEFAULT_PERSONA;
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.PERSONA);
        if (!stored) return DEFAULT_PERSONA;
        return { ...DEFAULT_PERSONA, ...JSON.parse(stored) };
    } catch {
        return DEFAULT_PERSONA;
    }
};

// Conversations
export const getConversationList = (): Conversation[] => {
    if (!isLocalStorageAvailable()) return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
        if (!stored) return [];
        const conversations: Conversation[] = JSON.parse(stored);
        // Sort by most recent first
        return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
        return [];
    }
};

export const saveConversation = (conversation: Conversation): void => {
    if (!isLocalStorageAvailable()) return;
    const conversations = getConversationList();
    const existingIndex = conversations.findIndex(c => c.id === conversation.id);

    if (existingIndex >= 0) {
        conversations[existingIndex] = conversation;
    } else {
        conversations.push(conversation);
    }

    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
};

export const loadConversation = (id: string): Conversation | null => {
    const conversations = getConversationList();
    return conversations.find(c => c.id === id) || null;
};

export const deleteConversation = (id: string): void => {
    if (!isLocalStorageAvailable()) return;
    const conversations = getConversationList().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));

    // If deleting current conversation, clear it
    if (getCurrentConversationId() === id) {
        setCurrentConversationId(null);
    }
};

export const renameConversation = (id: string, newTitle: string): void => {
    if (!isLocalStorageAvailable()) return;
    const conversations = getConversationList();
    const index = conversations.findIndex(c => c.id === id);
    if (index >= 0) {
        conversations[index].title = newTitle;
        conversations[index].updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    }
};

export const getCurrentConversationId = (): string | null => {
    if (!isLocalStorageAvailable()) return null;
    return localStorage.getItem(STORAGE_KEYS.CURRENT_CONVERSATION);
};

export const setCurrentConversationId = (id: string | null): void => {
    if (!isLocalStorageAvailable()) return;
    if (id) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_CONVERSATION, id);
    } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_CONVERSATION);
    }
};

// Generate conversation title from first message
export const generateConversationTitle = (messages: Message[]): string => {
    const userMessage = messages.find(m => m.role === 'user');
    if (!userMessage) return 'New Conversation';

    const content = userMessage.content.trim();
    if (content.length <= 40) return content;
    return content.substring(0, 37) + '...';
};

// Create a new conversation
export const createConversation = (): Conversation => {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
        id,
        title: 'New Conversation',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
};

// Storage usage indicator
export const getStorageUsage = (): { used: number; quota: number; percentage: number } => {
    if (!isLocalStorageAvailable()) {
        return { used: 0, quota: 5 * 1024 * 1024, percentage: 0 };
    }

    let totalSize = 0;

    // Calculate size of all Kinora data
    Object.values(STORAGE_KEYS).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
            // Each character is 2 bytes in localStorage (UTF-16)
            totalSize += item.length * 2;
        }
    });

    // Approximate quota (5MB for most browsers)
    const quota = 5 * 1024 * 1024;
    const percentage = (totalSize / quota) * 100;

    return { used: totalSize, quota, percentage };
};

// Clear all Kinora data
export const clearAllData = (): void => {
    if (!isLocalStorageAvailable()) return;
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
};

// Format bytes for display
export const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

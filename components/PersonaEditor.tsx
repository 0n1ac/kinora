"use client";
import { useState } from 'react';
import { User, Pencil, X } from 'lucide-react';
import { Persona, DEFAULT_PERSONA } from '@/lib/storage';
import styles from './PersonaEditor.module.css';

interface PersonaEditorProps {
    persona: Persona;
    onPersonaChange: (persona: Persona) => void;
}

const PROFICIENCY_OPTIONS = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
];

export default function PersonaEditor({ persona, onPersonaChange }: PersonaEditorProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editedPersona, setEditedPersona] = useState<Persona>(persona);

    const openModal = () => {
        setEditedPersona(persona);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const handleSave = () => {
        onPersonaChange(editedPersona);
        closeModal();
    };

    const handleReset = () => {
        setEditedPersona(DEFAULT_PERSONA);
    };

    const hasPersona = persona.name || persona.learningGoals || persona.customContext;

    return (
        <div className={styles.editorContainer}>
            <div className={styles.editorTitle}>
                <h3>Persona</h3>
                <button
                    className={styles.editButton}
                    onClick={openModal}
                    type="button"
                >
                    <Pencil size={12} />
                    {hasPersona ? 'Edit' : 'Set Up'}
                </button>
            </div>

            <div className={styles.personaPreview}>
                {hasPersona ? (
                    <div className={styles.personaInfo}>
                        {persona.name && (
                            <span className={styles.personaName}>{persona.name}</span>
                        )}
                        <span className={styles.personaLevel}>{persona.proficiencyLevel}</span>
                        {persona.learningGoals && (
                            <span className={styles.personaGoals}>{persona.learningGoals}</span>
                        )}
                    </div>
                ) : (
                    <div className={styles.personaEmpty}>
                        <User size={24} style={{ opacity: 0.3 }} />
                        <span>Set up your learning profile for personalized responses</span>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Edit Persona</h2>
                            <button
                                className={styles.closeButton}
                                onClick={closeModal}
                                type="button"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.fieldLabel}>Name (optional)</label>
                                <span className={styles.fieldDescription}>
                                    How should Kinora address you?
                                </span>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="e.g., Alex"
                                    value={editedPersona.name}
                                    onChange={(e) => setEditedPersona({
                                        ...editedPersona,
                                        name: e.target.value
                                    })}
                                />
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.fieldLabel}>Proficiency Level</label>
                                <select
                                    className={`${styles.input} ${styles.select}`}
                                    value={editedPersona.proficiencyLevel}
                                    onChange={(e) => setEditedPersona({
                                        ...editedPersona,
                                        proficiencyLevel: e.target.value as Persona['proficiencyLevel']
                                    })}
                                >
                                    {PROFICIENCY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.fieldLabel}>Learning Goals</label>
                                <span className={styles.fieldDescription}>
                                    What do you want to improve?
                                </span>
                                <textarea
                                    className={`${styles.input} ${styles.textarea}`}
                                    placeholder="e.g., I want to sound more natural in everyday conversations and improve my pronunciation"
                                    value={editedPersona.learningGoals}
                                    onChange={(e) => setEditedPersona({
                                        ...editedPersona,
                                        learningGoals: e.target.value
                                    })}
                                />
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.fieldLabel}>Additional Context</label>
                                <span className={styles.fieldDescription}>
                                    Anything else Kinora should know about you?
                                </span>
                                <textarea
                                    className={`${styles.input} ${styles.textarea}`}
                                    placeholder="e.g., I'm preparing for a job interview at a tech company"
                                    value={editedPersona.customContext}
                                    onChange={(e) => setEditedPersona({
                                        ...editedPersona,
                                        customContext: e.target.value
                                    })}
                                />
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button
                                className={styles.cancelButton}
                                onClick={handleReset}
                                type="button"
                            >
                                Reset
                            </button>
                            <button
                                className={styles.saveButton}
                                onClick={handleSave}
                                type="button"
                            >
                                Save Persona
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const runtime = 'edge';

interface Persona {
    name: string;
    learningGoals: string;
    proficiencyLevel: 'beginner' | 'intermediate' | 'advanced';
    customContext: string;
}

function buildSystemPrompt(targetLanguage: string, nativeLanguage: string, persona?: Persona): string {
    let personaContext = '';

    if (persona) {
        const parts: string[] = [];

        if (persona.name) {
            parts.push(`The user's name is ${persona.name}.`);
        }

        if (persona.proficiencyLevel) {
            const levelDescriptions = {
                beginner: 'a beginner - use simple vocabulary and short sentences',
                intermediate: 'at intermediate level - use natural conversation but avoid complex idioms',
                advanced: 'at advanced level - speak naturally as you would with a native speaker'
            };
            parts.push(`Their ${targetLanguage} level is ${levelDescriptions[persona.proficiencyLevel]}.`);
        }

        if (persona.learningGoals) {
            parts.push(`Their learning goals: ${persona.learningGoals}`);
        }

        if (persona.customContext) {
            parts.push(`Additional context: ${persona.customContext}`);
        }

        if (parts.length > 0) {
            personaContext = `\n\nUSER PROFILE:\n${parts.join('\n')}`;
        }
    }

    return `You're a real friend from abroad chatting with someone learning ${targetLanguage}.${personaContext}

RESPONSE FORMAT:
You MUST respond ONLY with a valid JSON object in this exact format (no markdown, no code blocks):
{"Answer": "your friendly response here", "Comments": "your learning feedback here"}

RULES FOR "Answer":
- ALWAYS write in ${targetLanguage}.
- Keep responses SHORT (1-3 sentences max). Talk like texting a friend.
- No emoji.
- Sound human, not like an AI. Use casual language, contractions, incomplete sentences sometimes.
- If the user gives short or vague answers, YOU lead the conversation. Ask interesting questions, share a quick thought, bring up new topics.
- Be curious about them. React genuinely to what they say.
- Never sound like a teacher or language app. Just be a chill friend.
${persona?.name ? `- Address them by name occasionally but not every message.` : ''}

RULES FOR "Comments":
- ALWAYS write in ${nativeLanguage}.
- Give helpful feedback on the user's ${targetLanguage}: grammar, sentence completeness, and naturalness of expression.
- IMPORTANT: The user's message is from voice-to-text, so there may be transcription errors. Consider possible voice recognition mistakes before commenting.
- If the sentence seems wrong, first think about what the user probably MEANT to say, then give advice based on the corrected interpretation.
- Keep comments brief, friendly, and encouraging. Focus on learning, not criticism.
- If the sentence is good, say something positive.
${persona?.proficiencyLevel === 'beginner' ? '- Be extra encouraging and patient. Celebrate small wins.' : ''}
${persona?.proficiencyLevel === 'advanced' ? '- Give more nuanced feedback about natural phrasing and subtle errors.' : ''}

Example response:
{"Answer": "Oh nice! So you're into that? I actually tried it once, total disaster haha. What got you started?", "Comments": "Your sentence was clear! Just a small tip: 'I have went' should be 'I have gone' or simply 'I went'."}`;
}

export async function POST(req: Request) {
    try {
        const { messages, targetLanguage = 'English', nativeLanguage = 'Korean', persona } = await req.json();

        const systemPrompt = buildSystemPrompt(targetLanguage, nativeLanguage, persona);

        const result = streamText({
            model: google('gemini-2.0-flash'),
            system: systemPrompt,
            messages,
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error('Chat API error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to process chat request' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

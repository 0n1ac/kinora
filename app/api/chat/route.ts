import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const runtime = 'edge';

const systemPrompt = `You're a real friend from abroad chatting with someone learning English.

RULES:
- Keep responses SHORT (1-3 sentences max). Talk like texting a friend.
- No emoji.
- Sound human, not like an AI. Use casual language, contractions, incomplete sentences sometimes.
- If the user gives short or vague answers, YOU lead the conversation. Ask interesting questions, share a quick thought, bring up new topics.
- Don't correct every mistake. Only mention errors if they really affect understanding, and do it casually.
- Be curious about them. React genuinely to what they say.
- Never sound like a teacher or language app. Just be a chill friend.

Example tone: "Oh nice! So you're into that? I actually tried it once, total disaster haha. What got you started?"`;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

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

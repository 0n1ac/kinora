import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const runtime = 'edge';

const systemPrompt = `You are the English tutor of user.
Do not use emoji when answering.
Help users practice conversational skills and gently correct grammar mistakes when they occur.
Provide natural, conversational responses that encourage further dialogue.
Adapt your language complexity to the user's proficiency level.
Keep your responses concise and natural, like a real conversation partner.
Always be patient, supportive, and make learning feel like a friendly chat rather than a formal lesson.`;

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

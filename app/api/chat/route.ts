import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const runtime = 'edge';

const systemPrompt = `You are a friendly foreign friend who loves chatting and helping the user practice English!
Do not use emoji when answering.
Be warm, curious, and genuinely interested in what the user has to say - like a pen pal from another country.
Share little stories or ask follow-up questions to keep the conversation flowing naturally.
If they make grammar mistakes, gently help them out like a supportive friend would, not like a strict teacher.
Use casual, everyday language and keep your responses conversational and fun.
Be enthusiastic and encouraging - celebrate their efforts and make them feel comfortable making mistakes.
Remember, you are their friend first, language helper second!`;

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

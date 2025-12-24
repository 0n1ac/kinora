import { EdgeTTS } from 'edge-tts-universal';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const text = searchParams.get('text');

        if (!text) {
            return new Response(
                JSON.stringify({ error: 'Text parameter is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Use a natural-sounding American English voice (Jenny is friendly and clear)
        const tts = new EdgeTTS(text, 'en-US-JennyNeural');
        const result = await tts.synthesize();

        // Convert to buffer for response
        const audioBuffer = Buffer.from(await result.audio.arrayBuffer());

        return new Response(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            },
        });
    } catch (error) {
        console.error('TTS API error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to generate speech' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}


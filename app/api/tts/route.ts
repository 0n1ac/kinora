import { EdgeTTS } from 'edge-tts-universal';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const text = searchParams.get('text');
        const voice = searchParams.get('voice') || 'en-US-JennyNeural';
        const rate = parseInt(searchParams.get('rate') || '0', 10);
        const pitch = parseInt(searchParams.get('pitch') || '0', 10);

        if (!text) {
            return new Response(
                JSON.stringify({ error: 'Text parameter is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Format rate and pitch for Edge TTS
        const rateStr = rate >= 0 ? `+${rate}%` : `${rate}%`;
        const pitchStr = pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`;

        // Use the selected voice with rate and pitch options
        const tts = new EdgeTTS(text, voice, {
            rate: rateStr,
            pitch: pitchStr
        });
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


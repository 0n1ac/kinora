import { NextRequest, NextResponse } from 'next/server';
import { pipeline } from '@huggingface/transformers';
import path from 'path';

// Project-local models folder for easy cleanup
const MODELS_DIR = path.join(process.cwd(), 'models');

// Cache the pipeline to avoid reloading the model on every request
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transcriber: any = null;

async function getTranscriber() {
    if (!transcriber) {
        console.log('[Whisper] Loading model... (this may take a moment on first use)');
        console.log(`[Whisper] Models will be stored in: ${MODELS_DIR}`);
        transcriber = await pipeline(
            'automatic-speech-recognition',
            'onnx-community/whisper-small.en', // Small model for good balance of accuracy and speed
            {
                dtype: 'fp32',
                cache_dir: MODELS_DIR, // Store models in project folder
            }
        );
        console.log('[Whisper] Model loaded successfully');
    }
    return transcriber;
}

export async function POST(request: NextRequest) {
    try {
        // Parse JSON body with audio data
        const body = await request.json();
        const audioArray = body.audio;

        if (!audioArray || !Array.isArray(audioArray)) {
            return NextResponse.json(
                { error: 'No audio data provided' },
                { status: 400 }
            );
        }

        // Convert array back to Float32Array
        const audioData = new Float32Array(audioArray);

        // Get or initialize the transcriber
        const asr = await getTranscriber();

        // Transcribe the audio (already in Float32Array format at 16kHz)
        const result = await asr(audioData);

        // Extract text from result
        let transcribedText = '';
        if (typeof result === 'string') {
            transcribedText = result.trim();
        } else if (result && typeof result === 'object' && 'text' in result) {
            transcribedText = (result as { text: string }).text.trim();
        } else if (Array.isArray(result) && result.length > 0) {
            const first = result[0];
            if (typeof first === 'string') {
                transcribedText = first.trim();
            } else if (first && typeof first === 'object' && 'text' in first) {
                transcribedText = (first as { text: string }).text.trim();
            }
        }

        return NextResponse.json({ transcript: transcribedText });
    } catch (error) {
        console.error('Whisper STT error:', error);
        return NextResponse.json(
            { error: 'Failed to transcribe audio', details: String(error) },
            { status: 500 }
        );
    }
}

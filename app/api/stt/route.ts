import { NextRequest, NextResponse } from 'next/server';
import { pipeline } from '@huggingface/transformers';
import path from 'path';

// Project-local models folder for easy cleanup
const MODELS_DIR = path.join(process.cwd(), 'models');

// Cache pipelines for each model to avoid reloading
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transcriberCache: Record<string, any> = {};

const MODEL_MAP: Record<string, string> = {
    'tiny': 'onnx-community/whisper-tiny.en',
    'small': 'onnx-community/whisper-small.en',
};

async function getTranscriber(modelSize: string = 'small') {
    const modelId = MODEL_MAP[modelSize] || MODEL_MAP['small'];

    if (!transcriberCache[modelId]) {
        console.log(`[Whisper] Loading model: ${modelSize}... (this may take a moment on first use)`);
        console.log(`[Whisper] Models will be stored in: ${MODELS_DIR}`);
        transcriberCache[modelId] = await pipeline(
            'automatic-speech-recognition',
            modelId,
            {
                dtype: 'fp32',
                cache_dir: MODELS_DIR,
            }
        );
        console.log(`[Whisper] Model ${modelSize} loaded successfully`);
    }
    return transcriberCache[modelId];
}

export async function POST(request: NextRequest) {
    try {
        // Parse JSON body with audio data
        const body = await request.json();
        const audioArray = body.audio;
        const modelSize = body.model || 'small';

        if (!audioArray || !Array.isArray(audioArray)) {
            return NextResponse.json(
                { error: 'No audio data provided' },
                { status: 400 }
            );
        }

        // Convert array back to Float32Array
        const audioData = new Float32Array(audioArray);

        // Get or initialize the transcriber for the selected model
        const asr = await getTranscriber(modelSize);

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

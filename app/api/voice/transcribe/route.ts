import { NextRequest, NextResponse } from 'next/server';
import { processVoicePipeline } from '@/lib/voice/pipeline/voice-pipeline';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let patientId = '';
    let encounterId = '';
    let languageHint = '';
    let asrProvider = '';
    let rawTranscriptOverride = '';
    let audioBuffer: Buffer | undefined = undefined;
    let audioMimeType = 'audio/webm';
    let audioBase64 = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      patientId = (formData.get('patientId') as string) || '';
      encounterId = (formData.get('encounterId') as string) || '';
      languageHint = (formData.get('languageHint') as string) || (formData.get('language') as string) || '';
      asrProvider = (formData.get('asrProvider') as string) || '';
      rawTranscriptOverride = (formData.get('rawTranscriptOverride') as string) || '';

      const audioFile = formData.get('audio') as File | null;
      if (audioFile) {
        audioMimeType = audioFile.type || 'audio/webm';
        const arrayBuffer = await audioFile.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuffer);
      }
    } else {
      const body = await req.json().catch(() => ({}));
      patientId = body.patientId || '';
      encounterId = body.encounterId || '';
      languageHint = body.languageHint || body.language || '';
      asrProvider = body.asrProvider || '';
      rawTranscriptOverride = body.rawTranscriptOverride || '';
      audioBase64 = body.audioBase64 || body.audio || '';
      if (body.audioMimeType) audioMimeType = body.audioMimeType;
    }

    const result = await processVoicePipeline({
      patientId,
      encounterId,
      audioBuffer,
      audioBase64,
      audioMimeType,
      languageHint,
      asrProvider,
      rawTranscriptOverride,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error: any) {
    console.error('[Voice Transcribe API] Internal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error processing voice pipeline',
      },
      { status: 500 }
    );
  }
}

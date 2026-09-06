import { NextResponse } from 'next/server';
import { translatePatientText } from '../../../lib/translation/indictrans-client';
import { z } from 'zod';

const TranslateApiSchema = z.object({
  sourceLanguage: z.string().min(1),
  patientText: z.string(),
  targetLanguage: z.string().optional().default('eng_Latn'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = TranslateApiSchema.parse(body);

    const result = await translatePatientText({
      patientText: parsed.patientText,
      sourceLanguage: parsed.sourceLanguage,
      targetLanguage: parsed.targetLanguage,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Translation API route error:', error);
    const err = error as Error;
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to process translation request',
      },
      { status: 400 }
    );
  }
}

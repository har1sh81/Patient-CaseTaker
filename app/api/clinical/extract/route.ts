import { NextRequest, NextResponse } from 'next/server';
import { extractClinicalFactsForEncounter, extractClinicalFactsFromConversation } from '@/lib/clinical/fact-extraction';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { encounterId, answerId } = body;

    if (!encounterId && !answerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either encounterId or answerId must be provided in request body',
        },
        { status: 400 }
      );
    }

    let result;
    if (encounterId) {
      result = await extractClinicalFactsForEncounter(encounterId);
    } else {
      result = await extractClinicalFactsFromConversation(answerId);
    }

    if (!result.success) {
      const status = result.error?.includes('consent') ? 403 : 400;
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error: any) {
    console.error('[Clinical Fact Extraction API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error during clinical fact extraction',
      },
      { status: 500 }
    );
  }
}

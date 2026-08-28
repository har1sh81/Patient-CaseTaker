import { NextResponse } from 'next/server';
import { getHealthRecordProvider } from '../../../../../lib/abdm/factory';

export async function POST(request: Request) {
  try {
    const { abhaReference } = await request.json();

    if (!abhaReference) {
      return NextResponse.json({ success: false, error: 'ABHA reference is required' }, { status: 400 });
    }

    const provider = getHealthRecordProvider();
    const result = await provider.requestConsent(abhaReference);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('ABDM Consent Request Error:', error);
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

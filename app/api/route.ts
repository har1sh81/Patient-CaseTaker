import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    message: 'MediKiosk API Service is online.',
    timestamp: new Date().toISOString()
  });
}

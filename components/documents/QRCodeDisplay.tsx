'use client';

import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCcw, Smartphone, Clock } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { Alert } from '../ui/alert';

interface QRCodeDisplayProps {
  sessionId: string;
}

export function QRCodeDisplay({ sessionId }: QRCodeDisplayProps) {
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [timeLeft, setTimeLeft] = React.useState<number>(0);

  const fetchToken = React.useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/kiosk/documents/upload-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate QR code');
      }
      setToken(data.token);
      setTimeLeft(10 * 60); // 10 minutes in seconds
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      void fetchToken();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchToken]);

  React.useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isExpired = timeLeft <= 0 && token !== null;

  return (
    <Card className="p-8 border border-border-light rounded-2xl flex flex-col items-center gap-6 bg-surface-main">
      <div className="text-center flex flex-col gap-2">
        <h3 className="text-2xl font-bold text-secondary">Scan to Upload</h3>
        <p className="text-text-secondary text-sm max-w-sm">
          Use your phone&apos;s camera to scan this QR code. It will securely connect your phone to this session.
        </p>
      </div>

      {errorMsg && (
        <Alert variant="error" title="QR Generation Failed" className="w-full">
          {errorMsg}
        </Alert>
      )}

      <div className="relative flex items-center justify-center bg-white p-4 rounded-2xl shadow-sm border border-border-light min-h-[200px] min-w-[200px]">
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Spinner className="w-8 h-8 text-primary" />
            <span className="text-sm text-text-muted">Generating...</span>
          </div>
        ) : isExpired ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <Clock className="w-12 h-12 text-warning" />
            <p className="text-text-main font-semibold">QR Code Expired</p>
            <Button variant="outline" size="sm" onClick={fetchToken} className="gap-2">
              <RefreshCcw className="w-4 h-4" />
              Generate New QR
            </Button>
          </div>
        ) : token ? (
          <QRCodeSVG 
            value={`${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/upload?token=${token}`}
            size={200}
            level="H"
            includeMargin={true}
          />
        ) : null}
      </div>

      {!loading && !isExpired && token && (
        <div className="flex items-center gap-2 text-warning font-semibold bg-warning/10 px-4 py-2 rounded-full">
          <Clock className="w-4 h-4" />
          <span>Code expires in {formatTime(timeLeft)}</span>
        </div>
      )}

      {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
        <div className="text-xs text-warning/90 bg-warning/5 border border-warning/20 p-3 rounded-xl max-w-sm text-center">
          <strong>Testing on mobile?</strong> Your phone cannot resolve <code>localhost</code>. Ensure both devices are on the same Wi-Fi network, and open this portal on your computer using your local network IP (e.g. <code>http://10.201.164.215:3000/kiosk</code>) instead of localhost.
        </div>
      )}

      <div className="flex items-center gap-3 text-text-muted text-sm bg-surface-muted px-4 py-3 rounded-xl w-full justify-center">
        <Smartphone className="w-5 h-5 shrink-0" />
        <p>No patient info is contained in this QR code.</p>
      </div>
    </Card>
  );
}

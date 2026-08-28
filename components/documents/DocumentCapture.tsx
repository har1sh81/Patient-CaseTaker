'use client';

import * as React from 'react';
import { UploadCloud, Camera, FileText, X, CheckCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';
import { Spinner } from '../ui/spinner';
import { MedicalDocumentTypeSchema } from '../../schemas';

interface DocumentCaptureProps {
  token: string;
  onUploadComplete: () => void;
}

export function DocumentCapture({ token, onUploadComplete }: DocumentCaptureProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [category, setCategory] = React.useState<string>('medical_note');
  const [status, setStatus] = React.useState<'idle' | 'validating' | 'uploading' | 'failed' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMsg(null);
    setStatus('validating');

    // Validate type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setErrorMsg('Invalid file type. Only PDF, PNG, or JPG are allowed.');
      setStatus('failed');
      return;
    }

    // Validate size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setErrorMsg('File is too large. Please choose a file smaller than 5 MB.');
      setStatus('failed');
      return;
    }

    setFile(selectedFile);
    setStatus('idle');
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('token', token);
      formData.append('category', category);

      const res = await fetch('/api/kiosk/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload document');
      }

      setStatus('success');
      setTimeout(() => {
        setFile(null);
        setStatus('idle');
        onUploadComplete();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error occurred during upload.');
      setStatus('failed');
    }
  };

  const clearSelection = () => {
    setFile(null);
    setStatus('idle');
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="p-6 border border-border-light rounded-2xl flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-bold text-secondary">Add Document</h3>
        <p className="text-sm text-text-secondary">
          Upload prescriptions, lab reports, or other medical records.
        </p>
      </div>

      {errorMsg && (
        <Alert variant="error" title="Upload Error">
          {errorMsg}
        </Alert>
      )}

      {!file ? (
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="flex flex-col items-center justify-center gap-3 h-32 border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary-light/10"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute('capture');
                fileInputRef.current.click();
              }
            }}
          >
            <UploadCloud className="w-8 h-8 text-primary" />
            <span className="font-semibold text-text-main">Choose File</span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col items-center justify-center gap-3 h-32 border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary-light/10"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.setAttribute('capture', 'environment');
                fileInputRef.current.click();
              }
            }}
          >
            <Camera className="w-8 h-8 text-primary" />
            <span className="font-semibold text-text-main">Take Photo</span>
          </Button>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/png, image/jpeg, application/pdf"
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 bg-surface-muted p-4 rounded-xl border border-border-light relative">
            <FileText className="w-10 h-10 text-primary shrink-0" />
            <div className="flex-1 overflow-hidden">
              <p className="font-bold text-text-main truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-text-muted">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {status !== 'uploading' && status !== 'success' && (
              <button
                onClick={clearSelection}
                className="p-2 hover:bg-error/10 text-error rounded-full transition-colors absolute top-2 right-2"
                aria-label="Remove selected file"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-text-secondary">Document Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={status === 'uploading' || status === 'success'}
              className="w-full p-3 border border-border-light rounded-xl bg-surface-main text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {MedicalDocumentTypeSchema.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full min-h-[52px]"
            disabled={status === 'uploading' || status === 'success'}
            onClick={handleUpload}
          >
            {status === 'uploading' ? (
              <span className="flex items-center gap-2">
                <Spinner className="w-5 h-5 text-white" />
                Uploading...
              </span>
            ) : status === 'success' ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-white" />
                Upload Complete
              </span>
            ) : (
              'Upload Document'
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}

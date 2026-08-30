 
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { KioskLayout } from '../../../components/kiosk/kiosk-layout';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Checkbox } from '../../../components/ui/checkbox';
import { Alert } from '../../../components/ui/alert';
import { Spinner } from '../../../components/ui/spinner';
import { Dialog } from '../../../components/ui/dialog';
import { translations, SupportedLanguage } from '../../../lib/kiosk/translation';
import type { Patient, IntakeSession, Consent } from '../../../types';
import {
  Sparkles,
  Search,
  Camera,
  UserPlus,
  Activity,
  ShieldCheck,
  CheckCircle,
  FileText,
  Volume2,
  QrCode,
  AlertTriangle,
  Printer,
} from 'lucide-react';

export default function KioskPage() {
  const router = useRouter();
  
  // Navigation & UI States
  const [lang, setLang] = React.useState<SupportedLanguage>('en');
  const [deptMode, setDeptMode] = React.useState<'standard' | 'ayush'>('standard');
  const [step, setStep] = React.useState<
    'WELCOME' | 'IDENTIFY_METHOD' | 'IDENTIFY_FORM' | 'IDENTIFY_SCAN' | 'REGISTRATION' | 'CONSENT' | 'ABDM_CONSENT' | 'COMPLETED'
  >('WELCOME');

  // Input states
  const [method, setMethod] = React.useState<'abha' | 'hospital' | 'mobile' | 'new' | null>(null);
  const [idValue, setIdValue] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);

  // QR Scan simulation states
  const [scanState, setScanState] = React.useState<'idle' | 'scanning' | 'success'>('idle');
  const [scanLog, setScanLog] = React.useState('');

  // Demographics form states
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [dob, setDob] = React.useState('');
  const [manualAge, setManualAge] = React.useState('');
  const [gender, setGender] = React.useState<'male' | 'female' | 'other' | 'prefer_not_to_say' | ''>('');
  const [mobileNum, setMobileNum] = React.useState('');
  const [abhaRef, setAbhaRef] = React.useState('');
  const [hspRef, setHspRef] = React.useState('');
  const [isCorrectingDetails, setIsCorrectingDetails] = React.useState(false);

  // ABDM states
  const [abdmTxnId, setAbdmTxnId] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [isAbdmLoading, setIsAbdmLoading] = React.useState(false);

  // Consent checkbox
  const [consentAgree, setConsentAgree] = React.useState(false);
  const permissions = {
    intakeCollection: true,
    voiceProcessing: true,
    documentProcessing: true,
    aiAssistedStructuring: true,
    reportGeneration: true,
  };

  // Typed session response — derived from canonical Phase 2 contracts
  interface ActiveSessionData {
    success: true;
    patient: Patient;
    session: IntakeSession;
    consent: Consent;
  }
  const [activeSession, setActiveSession] = React.useState<ActiveSessionData | null>(null);

  const t = translations[lang];

  // Auto-calculate age from Date of Birth (Pure computation for 2026 kiosk context)
  const calculatedAge = React.useMemo(() => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return '';
    const birthYear = birthDate.getFullYear();
    const diffYears = 2026 - birthYear;
    return diffYears.toString();
  }, [dob]);

  const age = manualAge || calculatedAge;

  // Format ID types reactively
  const handleIdChange = (val: string) => {
    if (method === 'abha') {
      if (/[a-zA-Z]/.test(val)) {
        setIdValue(val.toUpperCase());
      } else {
        const digits = val.replace(/\D/g, '').slice(0, 14);
        const parts = [];
        for (let i = 0; i < digits.length; i += 4) {
          parts.push(digits.slice(i, i + 4));
        }
        setIdValue(parts.join('-'));
      }
    } else if (method === 'mobile') {
      setIdValue(val.replace(/\D/g, '').slice(0, 10));
    } else if (method === 'hospital') {
      const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (clean.startsWith('HSP')) {
        const num = clean.slice(3, 9);
        setIdValue(num ? `HSP-${num}` : 'HSP-');
      } else {
        setIdValue(clean.slice(0, 9));
      }
    } else {
      setIdValue(val);
    }
  };

  // Perform backend lookup against real/mock patient repository
  const handleLookup = async (idToSearch?: string) => {
    const value = idToSearch || idValue;
    if (!value) {
      setSearchError('Please enter an identification number.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      let queryParam = '';
      if (method === 'abha' || (idToSearch && idToSearch.startsWith('ABHA'))) {
        queryParam = `abhaReference=${value}`;
      } else if (method === 'hospital' || (idToSearch && idToSearch.startsWith('HSP'))) {
        queryParam = `hospitalNumber=${value}`;
      } else {
        queryParam = `mobileNumber=${value}`;
      }

      const res = await fetch(`/api/kiosk/lookup?${queryParam}`);
      const data = await res.json();

      if (data.success && data.patient) {
        const p = data.patient;
        setFirstName(p.demographics.firstName);
        setLastName(p.demographics.lastName || '');
        setDob(p.demographics.dateOfBirth || '');
        setManualAge(p.demographics.age?.toString() || '');
        setGender(p.demographics.gender || '');
        setMobileNum(p.identification?.mobileNumber || p.contact?.mobileNumber || '');
        setAbhaRef(p.identification?.abhaReference || '');
        setHspRef(p.identification?.hospitalNumber || '');
        setIsCorrectingDetails(false);
        setStep('REGISTRATION'); // Proceed to confirm details
      } else {
        setSearchError(t.notFound);
      }
    } catch {
      setSearchError('Error contacting check-in servers.');
    } finally {
      setIsSearching(false);
    }
  };

  // Simulate scanning of QR code card
  const startScanSimulation = () => {
    setStep('IDENTIFY_SCAN');
    setScanState('scanning');
    setScanLog('Initializing kiosk camera reader...');

    setTimeout(() => {
      setScanLog('Pulsing scanner guidelines... Hold card steady.');
    }, 1000);

    setTimeout(() => {
      setScanLog('Decrypting ABHA signature block...');
    }, 2000);

    setTimeout(() => {
      setScanState('success');
      setScanLog('Scan Successful! ABHA-002 Decoded.');
      setTimeout(() => {
        // Auto-fill and execute lookup for seeded priority case
        setMethod('abha');
        setIdValue('ABHA-002');
        setStep('IDENTIFY_FORM');
        handleLookup('ABHA-002');
      }, 1200);
    }, 3000);
  };

  // Register New Patient Demographics
  const handleRegistrationSubmit = () => {
    if (!firstName) {
      setSearchError('First Name is required.');
      return;
    }
    setSearchError(null);
    setStep('CONSENT');
  };

  // Start Session Check-In transaction (Upsert patient, start session, save consent)
  const startSessionCheckIn = async () => {
    setIsSearching(true);
    setSearchError(null);

    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const generatedId = `pat_${now.toString(36)}`;
    const newPatientData = {
      id: hspRef ? `pat_${hspRef.substring(4)}` : generatedId,
      identification: {
        hospitalNumber: hspRef || `HSP-${now % 1000000}`,
        abhaReference: abhaRef || undefined,
        mobileNumber: mobileNum || undefined,
      },
      demographics: {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        dateOfBirth: dob || undefined,
        age: age ? parseInt(age) : undefined,
        gender: gender || undefined,
      },
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/kiosk/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: newPatientData,
          language: lang,
          departmentMode: deptMode,
          permissions,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setActiveSession(data);
        if (newPatientData.identification.abhaReference) {
          // If ABHA exists, trigger ABDM consent flow
          setStep('ABDM_CONSENT');
          startAbdmConsent(newPatientData.identification.abhaReference);
        } else {
          setStep('COMPLETED');
        }
      } else {
        setSearchError(data.error || 'Failed to initialize intake session.');
      }
    } catch {
      setSearchError('Network error starting intake check-in.');
    } finally {
      setIsSearching(false);
    }
  };

  const startAbdmConsent = async (abha: string) => {
    setIsAbdmLoading(true);
    setSearchError(null);
    try {
      const res = await fetch('/api/kiosk/abdm/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abhaReference: abha }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAbdmTxnId(data.data.transactionId);
      } else {
        // Skip ABDM seamlessly on failure
        setStep('COMPLETED');
      }
    } catch {
      setStep('COMPLETED');
    } finally {
      setIsAbdmLoading(false);
    }
  };

  const verifyAbdmConsent = async () => {
    if (!otp) return;
    setIsAbdmLoading(true);
    setSearchError(null);
    try {
      const res = await fetch('/api/kiosk/abdm/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: abdmTxnId,
          otp,
          abhaReference: abhaRef,
          patientId: activeSession?.patient.id,
          sessionId: activeSession?.session.id,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setSearchError(data.error || 'Failed to verify OTP');
      } else {
        setStep('COMPLETED');
      }
    } catch {
      setSearchError('Network error verifying consent');
    } finally {
      setIsAbdmLoading(false);
    }
  };

  const skipAbdmConsent = () => {
    setStep('COMPLETED');
  };

  // Standard stepper mapping index (Kiosk Entry covers Step 0: Consent stage checks)
  const getActiveStepIndex = () => {
    if (step === 'COMPLETED') return 4;
    return 0;
  };

  // Shared helper: call cleanup API then wipe all local state
  const performSessionCleanup = React.useCallback(
    async (reason: 'user_cancelled' | 'session_timeout' | 'consent_declined') => {
      if (activeSession?.session?.id) {
        try {
          await fetch('/api/kiosk/session/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: activeSession.session.id, reason }),
          });
        } catch {
          console.error('Session cleanup API call failed');
        }
      }
      setStep('WELCOME');
      setActiveSession(null);
      setIdValue('');
      setFirstName('');
      setLastName('');
      setDob('');
      setManualAge('');
      setGender('');
      setMobileNum('');
      setAbhaRef('');
      setHspRef('');
      setConsentAgree(false);
      setSearchError(null);
      setAbdmTxnId('');
      setOtp('');
    },
    [activeSession]
  );

  // Cancel wizard callback — reason: user explicitly cancelled
  const handleCancelIntake = React.useCallback(() => {
    performSessionCleanup('user_cancelled');
  }, [performSessionCleanup]);

  // Decline consent — reason: patient declined consent before session was created
  const handleDeclineConsent = React.useCallback(() => {
    performSessionCleanup('consent_declined');
  }, [performSessionCleanup]);

  // Timeout & Inactivity state machine
  const [isTimeoutWarningOpen, setIsTimeoutWarningOpen] = React.useState(false);
  const [secondsRemaining, setSecondsRemaining] = React.useState(30);
  const lastActivityRef = React.useRef<number>(0);

  // Reset inactivity timer on user action
  const resetInactivityTimer = React.useCallback(() => {
    lastActivityRef.current = Date.now();
    if (isTimeoutWarningOpen) {
      setIsTimeoutWarningOpen(false);
      setSecondsRemaining(30);
    }
  }, [isTimeoutWarningOpen]);

  // Handle timeout expiry — reason: session_timeout
  const handleTimeoutExpiry = React.useCallback(async () => {
    setIsTimeoutWarningOpen(false);
    await performSessionCleanup('session_timeout');
    setSearchError('Session expired due to inactivity. All patient data has been wiped.');
  }, [performSessionCleanup]);

  // Bind activity event listeners
  React.useEffect(() => {
    if (step === 'WELCOME' || step === 'COMPLETED') {
      return;
    }

    lastActivityRef.current = Date.now();

    const events = ['mousedown', 'keydown', 'touchstart', 'click'];
    const handler = () => resetInactivityTimer();

    events.forEach((ev) => window.addEventListener(ev, handler));

    // Periodic check every 1 second
    const interval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;

      // 90 seconds of inactivity -> show countdown dialog
      if (timeSinceLastActivity >= 90000 && !isTimeoutWarningOpen) {
        setIsTimeoutWarningOpen(true);
        setSecondsRemaining(30);
      }

      // Decrement countdown if dialog is open
      if (isTimeoutWarningOpen) {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleTimeoutExpiry();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handler));
      clearInterval(interval);
    };
  }, [step, isTimeoutWarningOpen, resetInactivityTimer, handleTimeoutExpiry]);

  return (
    <KioskLayout
      activeStepIndex={getActiveStepIndex()}
      language={lang}
      onLanguageChange={setLang}
      departmentMode={deptMode}
      onExit={step !== 'WELCOME' && step !== 'COMPLETED' ? handleCancelIntake : undefined}
      onBack={
        step === 'IDENTIFY_METHOD'
          ? () => setStep('WELCOME')
          : step === 'IDENTIFY_FORM'
          ? () => setStep('IDENTIFY_METHOD')
          : step === 'REGISTRATION'
          ? () => setStep(method === 'new' ? 'IDENTIFY_METHOD' : 'IDENTIFY_FORM')
          : step === 'CONSENT'
          ? () => setStep('REGISTRATION')
          : undefined
      }
      onNext={
        step === 'WELCOME'
          ? () => setStep('IDENTIFY_METHOD')
          : step === 'IDENTIFY_FORM'
          ? () => handleLookup()
          : step === 'REGISTRATION'
          ? handleRegistrationSubmit
          : step === 'CONSENT'
          ? startSessionCheckIn
          : step === 'ABDM_CONSENT'
          ? verifyAbdmConsent
          : undefined
      }
      nextDisabled={
        isSearching ||
        isAbdmLoading ||
        (step === 'IDENTIFY_FORM' && !idValue) ||
        (step === 'REGISTRATION' && !firstName) ||
        (step === 'CONSENT' && !consentAgree) ||
        (step === 'ABDM_CONSENT' && !otp)
      }
      nextLoading={isSearching || isAbdmLoading}
      nextLabel={
        step === 'WELCOME'
          ? t.start
          : step === 'CONSENT'
          ? 'Agree & Start Intake'
          : step === 'ABDM_CONSENT'
          ? 'Verify & Link Records'
          : step === 'IDENTIFY_FORM'
          ? 'Search'
          : t.next
      }
    >
      {/* 1. Welcome Screen */}
      {step === 'WELCOME' && (
        <Card className="p-8 border border-border-light shadow-md hover:shadow-lg transition-all rounded-2xl flex flex-col gap-6 text-center items-center">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary animate-pulse">
            <Activity className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-secondary tracking-tight mb-2">
              {t.welcome}
            </h2>
            <p className="text-text-secondary text-base max-w-md">
              {t.tagline}
            </p>
          </div>

          <div className="w-full h-[1px] bg-border-light my-2"></div>

          {/* Department mode selection toggles */}
          <div className="flex flex-col gap-2 items-center">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Select Intake Wing
            </span>
            <div className="flex gap-2 bg-surface-muted p-1 rounded-xl border border-border-light">
              <button
                onClick={() => setDeptMode('standard')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  deptMode === 'standard' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-main'
                }`}
              >
                General Medicine
              </button>
              <button
                onClick={() => setDeptMode('ayush')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  deptMode === 'ayush' ? 'bg-ayush text-white shadow-sm' : 'text-text-secondary hover:text-text-main'
                }`}
              >
                Ayurveda (AYUSH)
              </button>
            </div>
          </div>

          <Button
            size="lg"
            variant="primary"
            onClick={() => setStep('IDENTIFY_METHOD')}
            className="w-full max-w-sm mt-4 min-h-[56px] text-lg font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
          >
            <span>{t.start}</span>
            <Sparkles className="h-5 w-5 transition-transform group-hover:scale-110" />
          </Button>
        </Card>
      )}

      {/* 2. Identification Method Selection */}
      {step === 'IDENTIFY_METHOD' && (
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-secondary">{t.selectMethod}</h2>
            <p className="text-text-secondary text-sm">
              Use your physical card, health reference ID, phone lookup, or start a new file.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ABHA card */}
            <Card
              className="p-6 border border-border-light hover:border-primary/50 hover:bg-primary-light/5 cursor-pointer transition-all flex flex-col gap-3 rounded-xl group"
              onClick={() => {
                setMethod('abha');
                setIdValue('');
                setStep('IDENTIFY_FORM');
              }}
            >
              <div className="h-12 w-12 rounded-lg bg-primary-light flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-text-main group-hover:text-primary transition-colors">{t.abhaRef}</h3>
                <p className="text-xs text-text-secondary">Scan or enter your 14-digit government ABHA ID.</p>
              </div>
            </Card>

            {/* Hospital Card */}
            <Card
              className="p-6 border border-border-light hover:border-primary/50 hover:bg-primary-light/5 cursor-pointer transition-all flex flex-col gap-3 rounded-xl group"
              onClick={() => {
                setMethod('hospital');
                setIdValue('');
                setStep('IDENTIFY_FORM');
              }}
            >
              <div className="h-12 w-12 rounded-lg bg-primary-light flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-text-main group-hover:text-primary transition-colors">{t.hspRef}</h3>
                <p className="text-xs text-text-secondary">Enter hospital barcode card reference numbers.</p>
              </div>
            </Card>

            {/* Mobile number lookup */}
            <Card
              className="p-6 border border-border-light hover:border-primary/50 hover:bg-primary-light/5 cursor-pointer transition-all flex flex-col gap-3 rounded-xl group"
              onClick={() => {
                setMethod('mobile');
                setIdValue('');
                setStep('IDENTIFY_FORM');
              }}
            >
              <div className="h-12 w-12 rounded-lg bg-primary-light flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-text-main group-hover:text-primary transition-colors">{t.mobileRef}</h3>
                <p className="text-xs text-text-secondary">Search existing kiosk registration using mobile number.</p>
              </div>
            </Card>

            {/* New patient file */}
            <Card
              className="p-6 border border-border-light hover:border-primary/50 hover:bg-primary-light/5 cursor-pointer transition-all flex flex-col gap-3 rounded-xl group"
              onClick={() => {
                setMethod('new');
                setFirstName('');
                setLastName('');
                setDob('');
                setManualAge('');
                setGender('');
                setMobileNum('');
                setAbhaRef('');
                setHspRef('');
                setStep('REGISTRATION');
              }}
            >
              <div className="h-12 w-12 rounded-lg bg-primary-light flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-text-main group-hover:text-primary transition-colors">{t.newPatient}</h3>
                <p className="text-xs text-text-secondary">Create a new local clinic file to receive your printed record.</p>
              </div>
            </Card>
          </div>

          <div className="flex items-center justify-center mt-2">
            <Button
              variant="outline"
              size="lg"
              onClick={startScanSimulation}
              className="flex items-center gap-2 font-bold min-h-[52px] border-primary text-primary hover:bg-primary-light/10"
            >
              <QrCode className="h-5 w-5" />
              <span>{t.scanSim}</span>
            </Button>
          </div>
        </div>
      )}

      {/* 3. Lookup Forms */}
      {step === 'IDENTIFY_FORM' && method && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold text-secondary">
              {method === 'abha' ? t.abhaRef : method === 'hospital' ? t.hspRef : t.mobileRef}
            </h2>
            <p className="text-text-secondary text-sm">
              Please enter the requested identifier below to fetch your record.
            </p>
          </div>

          <Card className="p-6 border border-border-light rounded-xl">
            <div className="flex flex-col gap-4">
              <label className="text-sm font-bold text-text-main">
                {method === 'abha' ? 'ABHA Card ID Number' : method === 'hospital' ? 'Hospital ID' : 'Mobile Number'}
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Input
                    value={idValue}
                    onChange={(e) => handleIdChange(e.target.value)}
                    placeholder={
                      method === 'abha'
                        ? t.abhaPlaceholder
                        : method === 'hospital'
                        ? t.hspPlaceholder
                        : t.mobilePlaceholder
                    }
                    className="min-h-[52px] text-lg font-mono pl-4 border-border-medium focus:ring-primary"
                  />
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleLookup()}
                  disabled={!idValue || isSearching}
                  className="min-h-[52px] px-6 font-bold flex gap-2 items-center"
                >
                  {isSearching ? <Spinner className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                  <span>{t.search}</span>
                </Button>
              </div>

              {searchError && (
                <Alert variant="error" title="Lookup Failed" className="mt-2">
                  {searchError}
                </Alert>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 4. Scanning simulation screen */}
      {step === 'IDENTIFY_SCAN' && (
        <Card className="p-8 border border-border-light rounded-2xl flex flex-col items-center gap-6">
          <h2 className="text-xl font-bold text-secondary">{t.scanStart}</h2>

          {/* Scanner view Mock */}
          <div className="relative w-64 h-64 rounded-xl border-2 border-primary overflow-hidden bg-slate-900 flex items-center justify-center">
            {/* Pulsing guides */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
            <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-primary"></div>

            {/* Moving Laser line */}
            {scanState === 'scanning' && (
              <div
                className="absolute left-0 right-0 h-1 bg-primary/70 shadow-[0_0_8px_rgba(var(--primary-rgb),0.7)] z-10"
                style={{
                  animation: 'scan 2.5s infinite linear',
                }}
              ></div>
            )}

            {/* QR Icon in center */}
            <Camera className={`h-16 w-16 text-slate-700 transition-transform ${scanState === 'scanning' ? 'animate-pulse' : 'text-primary scale-110'}`} />
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm font-semibold text-text-main">{scanLog}</p>
            <p className="text-xs text-text-secondary">{t.scanInfo}</p>
          </div>
        </Card>
      )}

      {/* 5. Demographics Registration Form */}
      {step === 'REGISTRATION' && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold text-secondary">
              {method === 'new' ? t.newRegTitle : t.demographicsTitle}
            </h2>
            <p className="text-text-secondary text-sm">
              Please fill in your basic info or confirm the retrieved details below.
            </p>
          </div>

          <Card className="p-6 border border-border-light rounded-xl space-y-4">
            {/* ID labels read-only */}
            {(abhaRef || hspRef) && (
              <div className="flex gap-4 bg-surface-muted p-3.5 rounded-lg border border-border-light text-xs font-mono">
                {abhaRef && (
                  <div>
                    <span className="text-text-muted block">ABHA REF</span>
                    <span className="font-bold text-text-main">{abhaRef}</span>
                  </div>
                )}
                {hspRef && (
                  <div>
                    <span className="text-text-muted block">HOSPITAL ID</span>
                    <span className="font-bold text-text-main">{hspRef}</span>
                  </div>
                )}
              </div>
            )}

            {/* Edit details checkbox for lookups */}
            {method !== 'new' && (
              <div className="flex items-center gap-2 py-2">
                <Checkbox
                  id="correctDetails"
                  checked={isCorrectingDetails}
                  onChange={(e) => setIsCorrectingDetails(e.target.checked)}
                />
                <label htmlFor="correctDetails" className="text-sm font-semibold text-text-secondary cursor-pointer">
                  I need to correct or update my details
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">{t.firstName} *</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={method !== 'new' && !isCorrectingDetails}
                  placeholder="Jane"
                  className="min-h-[48px]"
                />
              </div>

              {/* Last Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">{t.lastName}</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={method !== 'new' && !isCorrectingDetails}
                  placeholder="Doe"
                  className="min-h-[48px]"
                />
              </div>

              {/* DOB */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">{t.dob}</label>
                <Input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  disabled={method !== 'new' && !isCorrectingDetails}
                  className="min-h-[48px]"
                />
              </div>

              {/* Age */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">{t.age}</label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setManualAge(e.target.value)}
                  disabled={method !== 'new' && !isCorrectingDetails}
                  placeholder="e.g. 30"
                  className="min-h-[48px]"
                />
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">{t.gender}</label>
                <Select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as typeof gender)}
                  disabled={method !== 'new' && !isCorrectingDetails}
                  className="min-h-[48px]"
                  options={[
                    { value: 'male', label: t.male },
                    { value: 'female', label: t.female },
                    { value: 'other', label: t.other },
                    { value: 'prefer_not_to_say', label: t.preferNotToSay },
                  ]}
                />
              </div>

              {/* Mobile Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">{t.mobile}</label>
                <Input
                  value={mobileNum}
                  onChange={(e) => setMobileNum(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={method !== 'new' && !isCorrectingDetails}
                  placeholder="10-digit mobile number"
                  className="min-h-[48px]"
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 6. Consent Screen */}
      {step === 'CONSENT' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div>
            <h2 className="text-2xl font-bold text-secondary">{t.consentTitle}</h2>
            <p className="text-text-secondary text-sm">{t.consentDetails}</p>
          </div>

          <Card className="p-6 border border-border-light rounded-xl space-y-6">
            {/* Consent Bullet items */}
            <div className="flex flex-col gap-4">
              <div className="flex gap-3.5 items-start">
                <div className="h-9 w-9 bg-primary-light text-primary rounded-lg flex items-center justify-center shrink-0">
                  <Volume2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-text-main text-sm">Voice Intake Symptom Recording</h4>
                  <p className="text-xs text-text-secondary">
                    Intake interview dialogue will be recorded and transcribed to capture details of your symptoms.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="h-9 w-9 bg-primary-light text-primary rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-text-main text-sm">Medical Document Scanning (OCR)</h4>
                  <p className="text-xs text-text-secondary">
                    MediKiosk scans paper prescriptions or test reports you place on the scanner tray.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="h-9 w-9 bg-primary-light text-primary rounded-lg flex items-center justify-center shrink-0">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-text-main text-sm">AI Clinical Consolidation</h4>
                  <p className="text-xs text-text-secondary">
                    AI models organize symptoms and documents into a structured summary for your physician.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="h-9 w-9 bg-primary-light text-primary rounded-lg flex items-center justify-center shrink-0">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-text-main text-sm">Structured Clinical History Report</h4>
                  <p className="text-xs text-text-secondary">
                    {t.consent4}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full h-[1px] bg-border-light"></div>

            {/* Checkbox agreements */}
            <div className="flex items-start gap-3 py-1">
              <Checkbox
                id="consentCheck"
                checked={consentAgree}
                onChange={(e) => setConsentAgree(e.target.checked)}
              />
              <label htmlFor="consentCheck" className="text-sm font-bold text-text-main cursor-pointer leading-5 select-none">
                {t.consentAgree}
              </label>
            </div>

            {/* Decline path */}
            <button
              type="button"
              onClick={handleDeclineConsent}
              className="text-xs text-text-secondary underline hover:text-error transition-colors cursor-pointer mt-1 select-none"
            >
              {t.declineConsent}
            </button>

            {searchError && (
              <Alert variant="error" title="Check-In Failed">
                {searchError}
              </Alert>
            )}
          </Card>
        </div>
      )}

      {/* ABDM Consent Screen */}
      {step === 'ABDM_CONSENT' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div>
            <h2 className="text-2xl font-bold text-secondary">Connect Health Records</h2>
            <p className="text-text-secondary text-sm">
              We found an ABHA ID. Would you like to securely link your past medical records to this visit?
            </p>
          </div>

          <Card className="p-6 border border-border-light rounded-xl space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex gap-3.5 items-start">
                <div className="h-9 w-9 bg-primary-light text-primary rounded-lg flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-text-main text-sm">Secure & Private</h4>
                  <p className="text-xs text-text-secondary">
                    Your records are retrieved directly from the Ayushman Bharat Digital Mission (ABDM) and only used for today&apos;s visit.
                  </p>
                </div>
              </div>
            </div>

            {abdmTxnId ? (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-text-main">Enter the 6-digit OTP sent to your registered mobile number:</p>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="font-mono text-center tracking-widest text-2xl h-14"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center p-4">
                <Spinner className="h-6 w-6 mr-2 text-primary" />
                <span className="text-sm text-text-secondary">Initiating consent request...</span>
              </div>
            )}

            <div className="w-full h-[1px] bg-border-light"></div>

            <button
              type="button"
              onClick={skipAbdmConsent}
              className="text-sm font-bold text-text-secondary underline hover:text-text-main transition-colors cursor-pointer text-center block w-full mt-2"
            >
              Skip, do not connect my records
            </button>

            {searchError && (
              <Alert variant="error" title="Verification Failed">
                {searchError}
              </Alert>
            )}
          </Card>
        </div>
      )}

      {/* 7. Check-In Success Completed Screen */}
      {step === 'COMPLETED' && activeSession && (
        <Card className="p-8 border border-border-light shadow-lg rounded-2xl flex flex-col items-center gap-6 text-center">
          <div className="h-16 w-16 bg-success/15 text-success rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle className="h-10 w-10" />
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-secondary tracking-tight mb-2">
              Check-In Successful!
            </h2>
            <p className="text-text-secondary text-sm">
              Session initialized. Your details have been verified.
            </p>
          </div>

          <div className="w-full bg-surface-muted p-4 rounded-xl border border-border-light text-left space-y-2 text-xs font-mono">
            <div>
              <span className="text-text-muted">PATIENT NAME:</span>
              <span className="font-bold text-text-main ml-2">{activeSession.patient.demographics.fullName}</span>
            </div>
            <div>
              <span className="text-text-muted">PATIENT ID:</span>
              <span className="font-bold text-text-main ml-2">{activeSession.patient.id}</span>
            </div>
            <div>
              <span className="text-text-muted">SESSION ID:</span>
              <span className="font-bold text-text-main ml-2 text-primary">{activeSession.session.id}</span>
            </div>
            <div>
              <span className="text-text-muted">DEPARTMENT:</span>
              <span className="font-bold text-text-main ml-2 capitalize">{activeSession.session.departmentMode} Wing</span>
            </div>
            <div>
              <span className="text-text-muted">CONSENT ID:</span>
              <span className="font-bold text-text-main ml-2">{activeSession.consent.id}</span>
            </div>
          </div>

          <div className="w-full h-[1px] bg-border-light"></div>

          <div className="space-y-3 w-full">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push(`/kiosk/interview?sessionId=${activeSession.session.id}`)}
              className="w-full min-h-[52px] font-bold"
            >
              Start Intake Interview
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleCancelIntake}
              className="w-full min-h-[52px]"
            >
              Reset Kiosk (Demo Mode)
            </Button>
          </div>
        </Card>
      )}

      {/* Inactivity warning dialog */}
      <Dialog
        isOpen={isTimeoutWarningOpen}
        onClose={resetInactivityTimer}
        title="Session Timeout Warning"
        footer={
          <Button variant="primary" onClick={resetInactivityTimer}>
            Continue Session
          </Button>
        }
      >
        <div className="flex gap-4 items-start">
          <AlertTriangle className="h-10 w-10 text-warning shrink-0" />
          <div>
            <p className="font-semibold text-text-main mb-1">Are you still there?</p>
            <p className="text-sm text-text-secondary">
              Due to inactivity, your check-in session will automatically cancel and wipe all entered details in{' '}
              <span className="font-bold text-error">{secondsRemaining}</span> seconds to protect your privacy.
            </p>
          </div>
        </div>
      </Dialog>

      {/* Embedded scanning CSS animations */}
      <style jsx global>{`
        @keyframes scan {
          0% {
            top: 4%;
          }
          50% {
            top: 94%;
          }
          100% {
            top: 4%;
          }
        }
      `}</style>
    </KioskLayout>
  );
}

'use client';

import * as React from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Select } from '../../../components/ui/select';
import { Checkbox } from '../../../components/ui/checkbox';
import { RadioGroup } from '../../../components/ui/radio';
import { YesNoSelector } from '../../../components/ui/yes-no';
import { Badge } from '../../../components/ui/badge';
import { Alert } from '../../../components/ui/alert';
import { Progress } from '../../../components/ui/progress';
import { Spinner } from '../../../components/ui/spinner';
import { Dialog } from '../../../components/ui/dialog';
import { ToastProvider } from '../../../components/ui/toast';
import { useToast } from '../../../hooks/use-toast';
import { KioskLayout } from '../../../components/kiosk/kiosk-layout';
import { PrintLayout } from '../../../components/print/print-layout';
import { Printer, Bell, Eye, Info } from 'lucide-react';

export default function DesignSystemShowcase() {
  const { addToast } = useToast();
  const [activeStep, setActiveStep] = React.useState(0);
  const [departmentMode, setDepartmentMode] = React.useState<'standard' | 'ayush'>('standard');
  const [language, setLanguage] = React.useState<'en' | 'hi' | 'ta'>('en');

  // Input states
  const [inputText, setInputText] = React.useState('');
  const [checkboxChecked, setCheckboxChecked] = React.useState(false);
  const [radioValue, setRadioValue] = React.useState('opt1');
  const [yesNoValue, setYesNoValue] = React.useState<boolean | undefined>(undefined);

  // Dialog States
  const [isDemoDialogOpen, setIsDemoDialogOpen] = React.useState(false);
  const [isWarningDialogOpen, setIsWarningDialogOpen] = React.useState(false);

  // Print Preview state
  const [showPrintPreview, setShowPrintPreview] = React.useState(false);

  const triggerToast = (type: 'success' | 'information' | 'warning' | 'error') => {
    addToast({
      type,
      title: `${type.toUpperCase()} Notification`,
      message: `This is a sample ${type} message triggered from the design system controls.`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Render print preview directly if selected
  if (showPrintPreview) {
    return (
      <div className="bg-white min-h-screen p-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center mb-6 no-print">
          <Button variant="secondary" onClick={() => setShowPrintPreview(false)}>
            Back to Design System
          </Button>
          <Button variant="primary" onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Report
          </Button>
        </div>
        <PrintLayout visit={{ generatedDate: '2026-08-26', departmentMode, intakeLanguage: language === 'en' ? 'English' : language === 'hi' ? 'Hindi' : 'Tamil' }} />
      </div>
    );
  }

  return (
    <KioskLayout
      activeStepIndex={activeStep}
      onBack={activeStep > 0 ? () => setActiveStep((prev) => prev - 1) : undefined}
      onNext={activeStep < 4 ? () => setActiveStep((prev) => prev + 1) : undefined}
      onExit={() => alert('Exit clicked')}
      departmentMode={departmentMode}
      language={language}
      onLanguageChange={setLanguage}
    >
      <ToastProvider />

      {/* Intro Header */}
      <div className="mb-2">
        <h2 className="text-2xl font-extrabold text-secondary tracking-tight">MediKiosk Design System</h2>
        <p className="text-text-secondary mt-1">This workspace demonstrates all visual components, focus states, and styling tokens defined for the kiosk screen layout.</p>
      </div>

      {/* Showcase Control Panel */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-secondary mb-4">Showcase Controls</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-text-main block mb-2">Toggle Department Mode</label>
            <div className="flex gap-2">
              <Button
                variant={departmentMode === 'standard' ? 'primary' : 'outline'}
                onClick={() => setDepartmentMode('standard')}
                className="flex-1"
              >
                Standard
              </Button>
              <Button
                variant={departmentMode === 'ayush' ? 'primary' : 'outline'}
                onClick={() => setDepartmentMode('ayush')}
                className="flex-1"
              >
                AYUSH
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-text-main block mb-2">Print Preview Tool</label>
            <Button
              variant="outline"
              onClick={() => setShowPrintPreview(true)}
              className="w-full flex items-center justify-center gap-2"
            >
              <Eye className="h-5 w-5" />
              <span>Preview Print Layout</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Colors Section */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-secondary mb-4">Color Palette & Semantic Tokens</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="h-12 w-full rounded-lg bg-primary border border-border-light shadow-sm" />
            <span className="text-xs font-bold text-text-main">primary</span>
            <span className="text-[10px] text-text-secondary font-mono">#0F766E</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="h-12 w-full rounded-lg bg-secondary border border-border-light shadow-sm" />
            <span className="text-xs font-bold text-text-main">secondary</span>
            <span className="text-[10px] text-text-secondary font-mono">#123047</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="h-12 w-full rounded-lg bg-success border border-border-light shadow-sm" />
            <span className="text-xs font-bold text-text-main">success</span>
            <span className="text-[10px] text-text-secondary font-mono">#15803D</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="h-12 w-full rounded-lg bg-warning border border-border-light shadow-sm" />
            <span className="text-xs font-bold text-text-main">warning</span>
            <span className="text-[10px] text-text-secondary font-mono">#B45309</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="h-12 w-full rounded-lg bg-priority border border-border-light shadow-sm" />
            <span className="text-xs font-bold text-text-main">priority</span>
            <span className="text-[10px] text-text-secondary font-mono">#C2410C</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="h-12 w-full rounded-lg bg-error border border-border-light shadow-sm" />
            <span className="text-xs font-bold text-text-main">error</span>
            <span className="text-[10px] text-text-secondary font-mono">#B91C1C</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="h-12 w-full rounded-lg bg-ayush border border-border-light shadow-sm" />
            <span className="text-xs font-bold text-text-main">ayush</span>
            <span className="text-[10px] text-text-secondary font-mono">#3F7D4A</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="h-12 w-full rounded-lg bg-background-main border border-border-light shadow-sm" />
            <span className="text-xs font-bold text-text-main">background</span>
            <span className="text-[10px] text-text-secondary font-mono">#F7FAFA</span>
          </div>
        </div>
      </Card>

      {/* Button Showcase */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-secondary mb-4">Button System</h3>
        <div className="flex flex-col gap-6">
          {/* Variants row */}
          <div>
            <span className="text-xs font-semibold text-text-secondary uppercase block mb-3">Variants</span>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="success">Success</Button>
            </div>
          </div>

          {/* Sizes and loading */}
          <div>
            <span className="text-xs font-semibold text-text-secondary uppercase block mb-3">Sizes & States</span>
            <div className="flex flex-wrap gap-3 items-center">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
              <Button isLoading variant="primary">Loading</Button>
              <Button disabled variant="primary">Disabled</Button>
            </div>
          </div>

          {/* Kiosk large */}
          <div>
            <span className="text-xs font-semibold text-text-secondary uppercase block mb-3">Kiosk Touchscreen Target</span>
            <Button variant="kioskLarge">Large Kiosk Touchscreen Action</Button>
          </div>
        </div>
      </Card>

      {/* Form Controls */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-secondary mb-4">Form Component System</h3>
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Standard Patient Input"
              placeholder="Enter text..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              helperText="Helper description: Enter patient demographic details."
            />
            <Input
              label="Input with Error Status"
              placeholder="Invalid entry..."
              error="Hospital ID format is incorrect. Please match standard configuration."
              required
            />
          </div>

          <Textarea
            label="Intake History Symptoms (Textarea)"
            placeholder="Type symptoms narrative here..."
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Department Mode Selection"
              options={[
                { value: 'std', label: 'Standard General Intake' },
                { value: 'ayu', label: 'AYUSH Ayurvedic Intake' },
              ]}
            />
            <Checkbox
              label="Patient hereby grants consent for voice recording and document structuring."
              checked={checkboxChecked}
              onChange={() => setCheckboxChecked(!checkboxChecked)}
            />
          </div>

          <RadioGroup
            label="Preferred Contact Channel"
            name="contact_channel"
            value={radioValue}
            onChange={setRadioValue}
            options={[
              { value: 'opt1', label: 'Mobile Text Notifications' },
              { value: 'opt2', label: 'Printed Copy Only' },
            ]}
          />

          {/* Yes/No touchscreen selector */}
          <YesNoSelector
            label="Do you have a previous history of respiratory conditions?"
            value={yesNoValue}
            onChange={setYesNoValue}
          />
        </div>
      </Card>

      {/* Cards Section */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-secondary mb-4">Card System</h3>
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4" variant="standard">
            <h4 className="font-bold text-text-main mb-1">Standard Card</h4>
            <p className="text-sm text-text-secondary">Standard card wrapper with drop shadow borders.</p>
          </Card>
          <Card className="p-4" variant="elevated">
            <h4 className="font-bold text-text-main mb-1">Elevated Card</h4>
            <p className="text-sm text-text-secondary">Medium drop shadows for high emphasis details.</p>
          </Card>
          <Card className="p-4" variant="interactive">
            <h4 className="font-bold text-text-main mb-1">Interactive Touch Card</h4>
            <p className="text-sm text-text-secondary">Hover and active animations for selections.</p>
          </Card>
          <Card className="p-4" variant="selected">
            <h4 className="font-bold text-text-main mb-1">Selected Card</h4>
            <p className="text-sm text-text-secondary">Soft teal background highlighting selection status.</p>
          </Card>
          <Card className="p-6 text-center col-span-2" variant="emptyState">
            <Info className="h-10 w-10 text-text-muted mx-auto mb-2" />
            <h4 className="font-bold text-text-main mb-1">No Documents Uploaded</h4>
            <p className="text-sm text-text-secondary">Please present your previous prescriptions or lab reports to the kiosk camera.</p>
          </Card>
        </div>
      </Card>

      {/* Modals & Alerts */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-secondary mb-4">Modals & Alert Systems</h3>
        <div className="flex flex-col gap-6">
          {/* Dialog buttons */}
          <div>
            <span className="text-xs font-semibold text-text-secondary uppercase block mb-3">Dialog Triggers</span>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setIsDemoDialogOpen(true)}>
                Open Standard Dialog
              </Button>
              <Button variant="outline" onClick={() => setIsWarningDialogOpen(true)}>
                Open Warning Dialog
              </Button>
            </div>
          </div>

          {/* Alerts list */}
          <div className="flex flex-col gap-4">
            <Alert variant="info" title="Information">
              The intake assistant will ask you questions about your chief complaint. You can answer using voice.
            </Alert>
            <Alert variant="success" title="Intake Complete">
              Intake process completed successfully. The report is ready to print.
            </Alert>
            <Alert variant="warning" title="Attention Required">
              Missing medication dosage details. Please review HPI entries.
            </Alert>
            <Alert variant="priority" title="Potential Priority Information — Requires Clinical Review">
              Patient reported severe chest pain. Flagged for immediate clinical review.
            </Alert>
            <Alert variant="error" title="Processing Failed">
              OCR engine failed to parse prescription image. Please try again.
            </Alert>
          </div>
        </div>
      </Card>

      {/* Progress & Badges */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-secondary mb-4">Progress & Status Badges</h3>
        <div className="flex flex-col gap-6">
          {/* Badges row */}
          <div>
            <span className="text-xs font-semibold text-text-secondary uppercase block mb-3">Status Badges</span>
            <div className="flex flex-wrap gap-2.5">
              <Badge variant="pending">Pending</Badge>
              <Badge variant="active">Active</Badge>
              <Badge variant="completed">Completed</Badge>
              <Badge variant="processing">Processing</Badge>
              <Badge variant="uploaded">Uploaded</Badge>
              <Badge variant="failed">Failed</Badge>
              <Badge variant="requires_review">Requires Review</Badge>
              <Badge variant="confirmed">Confirmed</Badge>
              <Badge variant="expired">Expired</Badge>
              <Badge variant="cancelled">Cancelled</Badge>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <span className="text-xs font-semibold text-text-secondary uppercase block mb-3">Linear Progress</span>
            <Progress value={65} />
          </div>

          {/* Spinners */}
          <div>
            <span className="text-xs font-semibold text-text-secondary uppercase block mb-3">Spinners</span>
            <div className="flex gap-6 items-center">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
              <Spinner size="xl" />
            </div>
          </div>
        </div>
      </Card>

      {/* Toast triggers */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-secondary mb-4">Toast Notifications</h3>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-1.5" onClick={() => triggerToast('success')}>
            <Bell className="h-4 w-4" /> Trigger Success Toast
          </Button>
          <Button variant="outline" className="flex items-center gap-1.5" onClick={() => triggerToast('information')}>
            <Bell className="h-4 w-4" /> Trigger Info Toast
          </Button>
          <Button variant="outline" className="flex items-center gap-1.5" onClick={() => triggerToast('warning')}>
            <Bell className="h-4 w-4" /> Trigger Warning Toast
          </Button>
          <Button variant="outline" className="flex items-center gap-1.5" onClick={() => triggerToast('error')}>
            <Bell className="h-4 w-4" /> Trigger Error Toast
          </Button>
        </div>
      </Card>

      {/* Reusable Dialogs instances */}
      <Dialog
        isOpen={isDemoDialogOpen}
        onClose={() => setIsDemoDialogOpen(false)}
        title="Standard Consultation Information"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsDemoDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setIsDemoDialogOpen(false)}>
              Understood
            </Button>
          </>
        }
      >
        <p className="text-sm">This is a standard informational dialog modal. Focus traps, esc triggers, and backdrop blur variables are active.</p>
      </Dialog>

      <Dialog
        isOpen={isWarningDialogOpen}
        onClose={() => setIsWarningDialogOpen(false)}
        title="Session Timeout Alert"
        destructive
        footer={
          <>
            <Button variant="outline" onClick={() => setIsWarningDialogOpen(false)}>
              End Session
            </Button>
            <Button variant="primary" onClick={() => setIsWarningDialogOpen(false)}>
              Keep Session Active
            </Button>
          </>
        }
      >
        <p className="text-sm">You have been inactive for more than 2 minutes. The session will automatically cancel and wipe temporary patient files in 30 seconds.</p>
      </Dialog>
    </KioskLayout>
  );
}

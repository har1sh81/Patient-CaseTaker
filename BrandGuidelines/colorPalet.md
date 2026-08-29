# MediKiosk — Complete Color Palette & Visual Color System

## 1. Color Strategy

MediKiosk should use a **calm, trustworthy, modern healthcare visual identity**.

The color palette must communicate:

- Trust
- Medical reliability
- Cleanliness
- Safety
- Technology
- Simplicity
- Accessibility
- Professionalism

The primary visual direction is:

> **Clinical Teal + Deep Navy + Clean White + Soft Gray**

The interface should not look like a typical colorful consumer application. It should feel like a modern healthcare system that is easy for patients to use on a large touchscreen.

---

# 2. Primary Brand Colors

## Primary Teal

The main MediKiosk brand color.

**HEX:** `#0F766E`

**RGB:** `15, 118, 110`

### Use for

- Primary buttons
- Active navigation
- Selected options
- Important progress indicators
- Primary icons
- Active form controls
- Brand accents
- Focused interactive elements

### Example

```css
--color-primary: #0F766E;
Primary Teal Hover

A darker version of the primary color.

HEX: #115E59

RGB: 17, 94, 89

Use for
Hovered primary buttons
Pressed buttons
Active interactive states
--color-primary-hover: #115E59;
Primary Teal Light

A soft version of the primary teal.

HEX: #CCFBF1

Use for
Selected card backgrounds
Informational sections
Soft highlights
Active option backgrounds
Progress backgrounds
--color-primary-light: #CCFBF1;
Primary Teal Pale

A very subtle teal tint.

HEX: #F0FDFA

Use for
Large page background sections
Subtle card backgrounds
Soft healthcare accents
--color-primary-pale: #F0FDFA;
3. Secondary Brand Colors
Clinical Navy

The main dark professional color.

HEX: #123047

Use for
Main headings
Important titles
Brand text
Report headings
High-emphasis information
--color-secondary: #123047;
Deep Navy

The strongest dark color in the system.

HEX: #0B1F2A

Use for
High-priority headings
Dark header sections
Strong text
Kiosk branding areas
--color-secondary-dark: #0B1F2A;
Clinical Blue

A supporting healthcare technology color.

HEX: #2563EB

Use for
Information states
Secondary actions
Technology-related indicators
Informational banners
--color-info: #2563EB;
Clinical Blue Light

HEX: #DBEAFE

Use for
Information cards
Informational banners
Help sections
Non-critical system messages
--color-info-light: #DBEAFE;
4. Neutral Color System

The neutral system is extremely important because most of MediKiosk should look clean and uncluttered.

Application Background

HEX: #F7FAFA

Use for the main application background.

--color-background: #F7FAFA;
Primary Surface

HEX: #FFFFFF

Use for:

Cards
Forms
Modals
Report sheets
Dialogs
--color-surface: #FFFFFF;
Secondary Surface

HEX: #F1F5F5

Use for:

Disabled sections
Secondary backgrounds
Input backgrounds
Subtle content grouping
--color-surface-secondary: #F1F5F5;
Border Color

HEX: #D9E2E2

Use for:

Card borders
Input borders
Dividers
Section separation
--color-border: #D9E2E2;
Strong Border

HEX: #B8C5C5

Use for:

Focused neutral borders
Strong section separators
Report table borders
--color-border-strong: #B8C5C5;
5. Text Color System
Primary Text

HEX: #102A33

Use for:

Main body text
Important content
Form values
--color-text-primary: #102A33;
Secondary Text

HEX: #52636B

Use for:

Supporting text
Descriptions
Secondary information
--color-text-secondary: #52636B;
Muted Text

HEX: #7A8A91

Use for:

Placeholders
Metadata
Timestamps
Helper text
--color-text-muted: #7A8A91;
Disabled Text

HEX: #A8B3B7

Use for:

Disabled buttons
Unavailable actions
Disabled form elements
--color-text-disabled: #A8B3B7;
6. Semantic Status Colors

These colors should have a consistent meaning throughout the entire application.

Never use different colors for the same meaning.

Success

Main: #15803D

Light Background: #DCFCE7

Border: #86EFAC

Use for
Completed steps
Successful upload
Consent completed
Information saved
Processing complete
--color-success: #15803D;
--color-success-light: #DCFCE7;
--color-success-border: #86EFAC;
Information

Main: #2563EB

Light Background: #EFF6FF

Border: #BFDBFE

Use for
Helpful information
Instructions
Processing information
General notifications
--color-information: #2563EB;
--color-information-light: #EFF6FF;
--color-information-border: #BFDBFE;
Warning

Main: #B45309

Light Background: #FEF3C7

Border: #FCD34D

Use for
Missing information
Incomplete sections
Review required
Retry recommended
--color-warning: #B45309;
--color-warning-light: #FEF3C7;
--color-warning-border: #FCD34D;
Potential Priority

Main: #C2410C

Light Background: #FFF7ED

Border: #FDBA74

Use for
Potential priority attention
Important information requiring prompt review
Deterministic attention flags
Important

Do not label the patient with a diagnosis.

Use language such as:

Potential Priority Information — Requires Clinical Review

--color-priority: #C2410C;
--color-priority-light: #FFF7ED;
--color-priority-border: #FDBA74;
Error

Main: #B91C1C

Light Background: #FEF2F2

Border: #FCA5A5

Use for
Upload failure
API failure
Invalid form submission
Session errors
Processing failure
--color-error: #B91C1C;
--color-error-light: #FEF2F2;
--color-error-border: #FCA5A5;
7. AYUSH Color Accent System

AYUSH mode should be visually distinguishable without making it look like a completely separate application.

The core MediKiosk design system should remain the same.

Use a subtle natural green accent.

AYUSH Primary

HEX: #3F7D4A

--color-ayush: #3F7D4A;
AYUSH Light

HEX: #EAF4EA

--color-ayush-light: #EAF4EA;
AYUSH Border

HEX: #B7D4BB

--color-ayush-border: #B7D4BB;
Use AYUSH colors for
AYUSH mode badge
Selected AYUSH option
AYUSH section heading
AYUSH report section
Ayurvedic questionnaire indicators
Do NOT
Change the entire application to green.
Use overly decorative traditional graphics.
Make AYUSH mode visually inconsistent with the rest of MediKiosk.
8. Button Color System
Primary Button
Background: #0F766E
Text:       #FFFFFF
Hover:      #115E59
Disabled:   #B8C5C5
Use for

The main action on every screen.

Examples:

Start
Continue
Confirm
Generate Report
Print Report
Secondary Button
Background: #FFFFFF
Text:       #0F766E
Border:     #0F766E
Hover BG:   #F0FDFA
Use for

Secondary actions.

Examples:

Back
Review
Edit
Try Again
Ghost Button
Background: Transparent
Text:       #52636B
Hover BG:   #F1F5F5
Use for

Low-emphasis actions.

Examples:

Cancel
Skip
View Details
Danger Button
Background: #B91C1C
Text:       #FFFFFF
Hover:      Darker red
Use only for
Delete document
End session
Remove important information
9. Form Input Color System
Default Input
Background: #FFFFFF
Border:     #D9E2E2
Text:       #102A33
Hovered Input
Border: #B8C5C5
Focused Input
Border:     #0F766E
Focus Ring: Primary teal with transparency
Error Input
Border: #B91C1C
Background: #FEF2F2
Disabled Input
Background: #F1F5F5
Text:       #A8B3B7
10. Selection Card Colors

Selection cards are important because MediKiosk is a touchscreen application.

Default
Background: #FFFFFF
Border:     #D9E2E2
Hovered
Background: #F0FDFA
Border:     #5EEAD4
Selected
Background: #CCFBF1
Border:     #0F766E
Text:       #115E59

Selected cards must not rely only on color.

Also show:

Check icon
Selected state
Border change
11. Progress Indicator Colors
Completed Step
Color: #0F766E
Active Step
Color: #2563EB
Upcoming Step
Color: #D9E2E2
Error Step
Color: #B91C1C
12. Voice Interaction Colors

Voice interaction should have a clear visual state.

Idle
Background: #F1F5F5
Icon:       #52636B
Ready
Background: #CCFBF1
Icon:       #0F766E
Listening
Background: #DBEAFE
Icon:       #2563EB
Processing
Background: #EFF6FF
Icon:       #2563EB
Recognition Error
Background: #FEF2F2
Icon:       #B91C1C
13. Document Processing Colors
Uploaded
Success Green
Processing
Clinical Blue
OCR Complete
Primary Teal
Needs Review
Warning Amber
Failed
Error Red
14. Clinical Attention Flag Colors

Attention flags must be visually noticeable but must not imply diagnosis.

Standard Attention Finding
Background: #FEF3C7
Border:     #FCD34D
Text:       #92400E

Label:

Potential Finding — Requires Physician Review

Potential Medication Finding
Background: #FFF7ED
Border:     #FDBA74
Text:       #9A3412

Label:

Potential Medication Finding — Requires Physician Review

Potential Priority Information
Background: #FFF7ED
Border:     #FDBA74
Text:       #9A3412

Label:

Potential Priority Information — Requires Clinical Review

15. Kiosk Screen Background Strategy

The kiosk should not use a pure white screen everywhere.

Use layered surfaces.

Application Background
        #F7FAFA

        ↓

Main Content Area
        #FFFFFF

        ↓

Secondary Sections
        #F1F5F5

        ↓

Selected/Active Elements
        #CCFBF1

This creates depth without heavy shadows.

16. Recommended Kiosk Screen Appearance
Header
Background: #FFFFFF
Border Bottom: #D9E2E2

Logo:

Primary Teal + Deep Navy
Main Content
Background: #F7FAFA
Primary Card
Background: #FFFFFF
Border: #D9E2E2
Active Question Card
Background: #FFFFFF
Accent: #0F766E
Bottom Navigation
Background: #FFFFFF
Border Top: #D9E2E2

Primary action:

#0F766E
17. Printable Clinical Report Color System

The physical report should be optimized for printers.

Do not depend heavily on colored backgrounds.

Report Text
Primary Text: #102A33
Report Heading
Deep Navy: #123047
Report Section Lines
Gray: #B8C5C5
Attention Flag

Use:

Dark text
+
Light background
+
Border
+
Clear icon/text label

The report must remain understandable if printed in grayscale.

Print Rule

Never use color as the only way to communicate:

Priority
Warning
Error
Completion
Attention

Always combine color with:

Text label
Icon
Border
Pattern or heading where appropriate
18. Complete CSS Variable Palette
:root {
  /* ==================================================
     MEDIKIOSK BRAND COLORS
     ================================================== */

  --color-primary: #0F766E;
  --color-primary-hover: #115E59;
  --color-primary-light: #CCFBF1;
  --color-primary-pale: #F0FDFA;

  --color-secondary: #123047;
  --color-secondary-dark: #0B1F2A;

  --color-clinical-blue: #2563EB;
  --color-clinical-blue-light: #DBEAFE;

  /* ==================================================
     NEUTRAL COLORS
     ================================================== */

  --color-background: #F7FAFA;
  --color-surface: #FFFFFF;
  --color-surface-secondary: #F1F5F5;

  --color-border: #D9E2E2;
  --color-border-strong: #B8C5C5;

  /* ==================================================
     TEXT COLORS
     ================================================== */

  --color-text-primary: #102A33;
  --color-text-secondary: #52636B;
  --color-text-muted: #7A8A91;
  --color-text-disabled: #A8B3B7;

  /* ==================================================
     STATUS COLORS
     ================================================== */

  --color-success: #15803D;
  --color-success-light: #DCFCE7;
  --color-success-border: #86EFAC;

  --color-information: #2563EB;
  --color-information-light: #EFF6FF;
  --color-information-border: #BFDBFE;

  --color-warning: #B45309;
  --color-warning-light: #FEF3C7;
  --color-warning-border: #FCD34D;

  --color-priority: #C2410C;
  --color-priority-light: #FFF7ED;
  --color-priority-border: #FDBA74;

  --color-error: #B91C1C;
  --color-error-light: #FEF2F2;
  --color-error-border: #FCA5A5;

  /* ==================================================
     AYUSH COLORS
     ================================================== */

  --color-ayush: #3F7D4A;
  --color-ayush-light: #EAF4EA;
  --color-ayush-border: #B7D4BB;
}
19. Tailwind Semantic Token Recommendation

Do not scatter raw hexadecimal values throughout MediKiosk components.

Use semantic tokens.

Prefer:

className="bg-primary text-primary-foreground"

Instead of:

className="bg-[#0F766E] text-white"

Recommended semantic groups:

background
foreground

card
card-foreground

primary
primary-foreground

secondary
secondary-foreground

muted
muted-foreground

accent
accent-foreground

border
input
ring

success
success-foreground

warning
warning-foreground

priority
priority-foreground

destructive
destructive-foreground

ayush
ayush-foreground
20. Color Usage Rules
Primary Teal

Use for primary actions and active states.

Do not use for every decorative element.

Deep Navy

Use for hierarchy and important text.

Do not use large areas of dark backgrounds throughout the kiosk.

White

Use as the primary content surface.

Soft Gray

Use to separate sections and create visual breathing space.

Status Colors

Use only for their defined semantic purpose.

For example:

Green   = Success
Blue    = Information
Amber   = Warning / Review
Orange  = Potential Priority
Red     = Error
Green Accent = AYUSH

Do not reuse these meanings inconsistently.

21. MediKiosk Visual Personality

The final UI should feel:

CLEAN
CLINICAL
CALM
TRUSTWORTHY
MODERN
ACCESSIBLE
TECHNOLOGICALLY ADVANCED
BUT NOT SCI-FI

Avoid:

Neon colors
Dark hacker-style interfaces
Excessive gradients
Too many colors
Heavy shadows
Glassmorphism everywhere
Overly playful illustrations
Flashy animations
Alarmist red screens
Dense dashboards

The visual hierarchy should always prioritize:

PATIENT ACTION
        ↓
CURRENT QUESTION
        ↓
IMPORTANT INFORMATION
        ↓
PROGRESS
        ↓
SECONDARY DETAILS
22. Final Palette Summary
Purpose	Color	HEX
Primary Brand	Medical Teal	#0F766E
Primary Hover	Deep Teal	#115E59
Primary Light	Soft Teal	#CCFBF1
Primary Pale	Pale Teal	#F0FDFA
Secondary	Clinical Navy	#123047
Deep Secondary	Deep Navy	#0B1F2A
Information	Clinical Blue	#2563EB
Background	Clinical Off-White	#F7FAFA
Surface	White	#FFFFFF
Secondary Surface	Soft Gray	#F1F5F5
Border	Light Gray	#D9E2E2
Primary Text	Deep Slate	#102A33
Secondary Text	Slate Gray	#52636B
Muted Text	Soft Slate	#7A8A91
Success	Medical Green	#15803D
Warning	Amber	#B45309
Potential Priority	Burnt Orange	#C2410C
Error	Clinical Red	#B91C1C
AYUSH	Natural Green	#3F7D4A
FINAL DESIGN PRINCIPLE

MediKiosk should visually communicate:

"A trustworthy healthcare assistant that listens carefully, organizes information clearly, and prepares the doctor for a faster, more informed consultation."

The dominant visual combination should always remain:

Medical Teal + Clinical Navy + Clean White + Soft Gray

Status and AYUSH colors should be used only as controlled semantic accents.
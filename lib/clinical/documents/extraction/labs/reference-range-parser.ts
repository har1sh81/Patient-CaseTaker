/**
 * Task #24 — Reference Range Parser
 * MediKiosk Clinical Engine
 * 
 * Safely parses reference range text explicitly present in source reports.
 * Does NOT invent reference ranges or perform population default fallbacks.
 */

import { ParsedReferenceRange } from './interpretation-types';

/**
 * Parses raw reference range string into structured numerical bounds.
 */
export function parseReferenceRange(rawRangeText?: string): ParsedReferenceRange {
  if (!rawRangeText || typeof rawRangeText !== 'string') {
    return { rawText: '', parseStatus: 'unparsed' };
  }

  const clean = rawRangeText.trim();
  if (!clean) {
    return { rawText: '', parseStatus: 'unparsed' };
  }

  // 1. Two-sided Bounded Range: "4.0 - 5.6", "70 - 110 mg/dL", "3.5–5.1", "3.5 to 5.1"
  const rangePattern = /([<>]?\s*\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*([<>]?\s*\d+(?:\.\d+)?)/i;
  const rangeMatch = clean.match(rangePattern);

  if (rangeMatch) {
    const lowerVal = parseFloat(rangeMatch[1].replace(/[^0-9.]/g, ''));
    const upperVal = parseFloat(rangeMatch[2].replace(/[^0-9.]/g, ''));

    if (!isNaN(lowerVal) && !isNaN(upperVal) && lowerVal <= upperVal) {
      return {
        rawText: clean,
        parseStatus: 'parsed',
        lower: lowerVal,
        upper: upperVal,
        lowerInclusive: true,
        upperInclusive: true,
        operator: 'range',
      };
    }
  }

  // 2. Open-ended Greater-Than Range: "> 5", ">= 5", "greater than 5"
  const gtPattern = /(?:>=|>|greater than|above)\s*(\d+(?:\.\d+)?)/i;
  const gtMatch = clean.match(gtPattern);
  if (gtMatch) {
    const bound = parseFloat(gtMatch[1]);
    if (!isNaN(bound)) {
      const isInclusive = clean.includes('>=');
      return {
        rawText: clean,
        parseStatus: 'parsed',
        lower: bound,
        lowerInclusive: isInclusive,
        operator: isInclusive ? '>=' : '>',
      };
    }
  }

  // 3. Open-ended Less-Than Range: "< 5", "<= 5", "less than 5", "up to 140"
  const ltPattern = /(?:<=|<|less than|up to|below)\s*(\d+(?:\.\d+)?)/i;
  const ltMatch = clean.match(ltPattern);
  if (ltMatch) {
    const bound = parseFloat(ltMatch[1]);
    if (!isNaN(bound)) {
      const isInclusive = clean.includes('<=');
      return {
        rawText: clean,
        parseStatus: 'parsed',
        upper: bound,
        upperInclusive: isInclusive,
        operator: isInclusive ? '<=' : '<',
      };
    }
  }

  // 4. Single numeric threshold (e.g. "<140")
  const singleMatch = clean.match(/^([<>])\s*(\d+(?:\.\d+)?)$/);
  if (singleMatch) {
    const op = singleMatch[1] as '>' | '<';
    const bound = parseFloat(singleMatch[2]);
    if (!isNaN(bound)) {
      return {
        rawText: clean,
        parseStatus: 'parsed',
        lower: op === '>' ? bound : undefined,
        upper: op === '<' ? bound : undefined,
        lowerInclusive: false,
        upperInclusive: false,
        operator: op,
      };
    }
  }

  // Malformed or unrecognized range text
  return {
    rawText: clean,
    parseStatus: 'unparsed',
  };
}

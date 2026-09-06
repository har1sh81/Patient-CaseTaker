/**
 * Task #20 — Rule-Based Document Classifier Implementation
 * MediKiosk Clinical Engine
 */

import {
  ClassificationInput,
  DocumentClassificationResult,
  DocumentClassifier,
  DocumentCategory,
  normalizeDocumentType,
} from './types';
import { CATEGORY_RULES } from './rules/classification-rules';

export const CLASSIFIER_VERSION = '1.0.0';

export class RuleBasedDocumentClassifier implements DocumentClassifier {
  /**
   * Classifies a medical document based on multi-evidence scoring of OCR text and document metadata.
   */
  async classify(input: ClassificationInput): Promise<DocumentClassificationResult> {
    const rawText = input.rawOcrText || '';
    const fileName = (input.fileName || '').toLowerCase();
    const cleanText = rawText.toLowerCase();
    const titleLine = rawText.split('\n').slice(0, 3).join(' ').toLowerCase();
    const manualDocType = input.manualDocumentType
      ? normalizeDocumentType(input.manualDocumentType)
      : undefined;

    // Track score and evidence per category
    const categoryScores: Record<
      DocumentCategory,
      { score: number; evidence: string[]; matchedKeywords: string[] }
    > = {
      opd_prescription: { score: 0, evidence: [], matchedKeywords: [] },
      laboratory_report: { score: 0, evidence: [], matchedKeywords: [] },
      discharge_summary: { score: 0, evidence: [], matchedKeywords: [] },
      imaging_report: { score: 0, evidence: [], matchedKeywords: [] },
      consultation_note: { score: 0, evidence: [], matchedKeywords: [] },
      ayush_record: { score: 0, evidence: [], matchedKeywords: [] },
      referral_note: { score: 0, evidence: [], matchedKeywords: [] },
      pediatric_record: { score: 0, evidence: [], matchedKeywords: [] },
      other: { score: 0, evidence: [], matchedKeywords: [] },
    };

    // Evaluate rules for each category
    for (const ruleSet of CATEGORY_RULES) {
      const cat = ruleSet.category;
      const target = categoryScores[cat];

      // 1. Filename matching
      for (const fnRule of ruleSet.filenameKeywords) {
        if (fileName.includes(fnRule.term.toLowerCase())) {
          target.score += fnRule.weight;
          const ev = `filename:${fnRule.term}`;
          if (!target.evidence.includes(ev)) target.evidence.push(ev);
          if (!target.matchedKeywords.includes(fnRule.term)) target.matchedKeywords.push(fnRule.term);
        }
      }

      // 2. Title line matching (higher weight)
      for (const tRule of ruleSet.titleKeywords) {
        if (titleLine.includes(tRule.term.toLowerCase())) {
          target.score += tRule.weight * 1.5;
          const ev = `title:${tRule.term}`;
          if (!target.evidence.includes(ev)) target.evidence.push(ev);
          if (!target.matchedKeywords.includes(tRule.term)) target.matchedKeywords.push(tRule.term);
        }
      }

      // 3. Full text keyword matching
      for (const kRule of ruleSet.textKeywords) {
        if (cleanText.includes(kRule.term.toLowerCase())) {
          target.score += kRule.weight;
          const ev = kRule.term;
          if (!target.evidence.includes(ev)) target.evidence.push(ev);
          if (!target.matchedKeywords.includes(kRule.term)) target.matchedKeywords.push(kRule.term);
        }
      }
    }

    // Metadata fallback evidence if text is short/missing but metadata/filename is informative
    if (!rawText.trim() && fileName) {
      const fallbackType = normalizeDocumentType(fileName);
      if (fallbackType !== 'other') {
        categoryScores[fallbackType].score += 3.0;
        categoryScores[fallbackType].evidence.push(`metadata_filename:${fileName}`);
      }
    }

    // Find category with maximum evidence score
    let bestCategory: DocumentCategory = 'other';
    let maxScore = 0;

    for (const cat of Object.keys(categoryScores) as DocumentCategory[]) {
      if (cat === 'other') continue;
      const data = categoryScores[cat];
      if (data.score > maxScore) {
        maxScore = data.score;
        bestCategory = cat;
      }
    }

    const MIN_EVIDENCE_THRESHOLD = 2.0;

    if (maxScore < MIN_EVIDENCE_THRESHOLD) {
      bestCategory = 'other';
    }

    // Calculate genuine confidence score
    let confidence = 0.40;
    if (bestCategory !== 'other') {
      // Scale score into realistic 0.60 - 0.97 confidence range based on evidence strength
      const rawRatio = maxScore / (maxScore + 3.0);
      confidence = Number((0.50 + rawRatio * 0.48).toFixed(2));
      confidence = Math.min(0.97, Math.max(0.60, confidence));
    }

    const winningData = categoryScores[bestCategory];
    const evidenceList =
      winningData.evidence.length > 0
        ? winningData.evidence
        : bestCategory === 'other'
        ? ['insufficient_text_evidence']
        : ['metadata_inference'];

    const matchesManual = manualDocType ? manualDocType === bestCategory : undefined;

    return {
      predictedDocumentType: bestCategory,
      confidence,
      method: 'rule_based',
      classifierVersion: CLASSIFIER_VERSION,
      evidence: evidenceList,
      matchedKeywords: winningData.matchedKeywords,
      needsReview: bestCategory === 'other' || confidence < 0.65,
      manualDocumentType: input.manualDocumentType,
      matchesManualType: matchesManual,
      classifiedAt: new Date().toISOString(),
    };
  }
}

export const defaultClassifier = new RuleBasedDocumentClassifier();

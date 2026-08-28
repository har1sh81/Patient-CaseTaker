import { db } from '../supabase/db-service';
import { ATTENTION_RULES, EvaluationContext } from './rules';
import { AttentionFlag } from '../../types';

export async function evaluateAttentionFlags(
  sessionId: string,
  patientId: string,
  context: EvaluationContext
): Promise<AttentionFlag[]> {
  const generatedFlags: AttentionFlag[] = [];

  for (const rule of ATTENTION_RULES) {
    try {
      const result = rule.evaluate(context);

      if (result) {
        generatedFlags.push({
          id: crypto.randomUUID(),
          sessionId,
          patientId,
          ruleId: rule.ruleId,
          category: 'red_flag', // Can map properly if rules have specific categories
          severity: rule.severity,
          label: rule.name,
          message: result.message,
          evidence: result.evidence,
          provenances: result.provenance,
          requiresClinicalReview: true,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error(`Error evaluating attention rule ${rule.ruleId}:`, e);
    }
  }

  // Deduplicate and persist
  const existingFlags = await db.getSessionFlags(sessionId);
  const finalFlags: AttentionFlag[] = [];

  for (const newFlag of generatedFlags) {
    // Check if a flag for this rule already exists
    const existing = existingFlags.find((f) => f.ruleId === newFlag.ruleId);
    
    if (existing) {
      // Merge evidence and provenances
      const mergedEvidence = Array.from(new Set([...existing.evidence, ...newFlag.evidence]));
      
      const mergedProvenances = [...existing.provenances];
      newFlag.provenances.forEach(newProv => {
        const exists = mergedProvenances.some(p => 
          p.source === newProv.source && 
          p.sourceId === newProv.sourceId &&
          p.documentId === newProv.documentId &&
          p.conversationMessageId === newProv.conversationMessageId
        );
        if (!exists) {
          mergedProvenances.push(newProv);
        }
      });

      const updatedFlag: AttentionFlag = {
        ...existing,
        evidence: mergedEvidence,
        provenances: mergedProvenances,
        updatedAt: new Date().toISOString(),
        // If it was dismissed or resolved, it might need to become active again
        // depending on clinical requirements. We'll leave it as is or reactivate if requested.
        // For now, if new evidence appears, reactivate it if it was resolved?
        // Let's keep it simple: just update the evidence.
      };
      
      await db.saveAttentionFlag(updatedFlag);
      finalFlags.push(updatedFlag);
    } else {
      await db.saveAttentionFlag(newFlag);
      finalFlags.push(newFlag);
    }
  }

  return finalFlags;
}

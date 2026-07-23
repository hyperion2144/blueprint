/**
 * prompt-pruner —: prune CAPABILITY-COMPENSATION sections based on prompt_profile.
 *
 * lite: remove CAPABILITY-COMPENSATION sections (model already knows how)
 * standard: keep all (default)
 * full: keep all (explicit full prompt)
 */

export type PromptProfile = 'lite' | 'standard' | 'full';

/** Prune agent prompt based on profile. Removes CAPABILITY-COMPENSATION sections in lite mode. */
export function prunePrompt(prompt: string, profile: PromptProfile): string {
  if (profile === 'standard' || profile === 'full') return prompt;

  // lite: remove sections marked <!-- CAPABILITY-COMPENSATION: ... -->
  // A section starts at the marker comment and ends at the next ## or ### heading or EOF.
  const lines = prompt.split('\n');
  const result: string[] = [];
  let skipping = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('<!-- CAPABILITY-COMPENSATION:')) {
      skipping = true;
      continue; // skip the marker line itself
    }
    if (skipping) {
      // Stop skipping at next heading or section marker
      if (line.startsWith('## ') || line.startsWith('### ') || line.includes('<!-- ENGINEERING-CONSTRAINT:')) {
        skipping = false;
        // Don't skip this line — it's the start of the next section
        result.push(line);
      }
      // else: still skipping (this line is part of the pruned section)
    } else {
      result.push(line);
    }
  }
  return result.join('\n');
}

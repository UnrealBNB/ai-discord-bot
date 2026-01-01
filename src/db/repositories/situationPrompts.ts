import { getDatabase } from '../index.js';
import { SituationType } from '../../utils/constants.js';

export interface SituationPrompt {
  guild_id: string;
  situation: string;
  prompt_text: string;
  updated_at: string;
}

export function getSituationPrompt(guildId: string, situation: SituationType): SituationPrompt | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM situation_prompts WHERE guild_id = ? AND situation = ?
  `);
  return stmt.get(guildId, situation) as SituationPrompt | null;
}

export function getAllSituationPrompts(guildId: string): SituationPrompt[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM situation_prompts WHERE guild_id = ?
  `);
  return stmt.all(guildId) as SituationPrompt[];
}

export function setSituationPrompt(guildId: string, situation: SituationType, promptText: string): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO situation_prompts (guild_id, situation, prompt_text)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id, situation)
    DO UPDATE SET prompt_text = ?, updated_at = datetime('now')
  `);
  stmt.run(guildId, situation, promptText, promptText);
}

export function deleteSituationPrompt(guildId: string, situation: SituationType): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    DELETE FROM situation_prompts WHERE guild_id = ? AND situation = ?
  `);
  const result = stmt.run(guildId, situation);
  return result.changes > 0;
}

export function hasCustomPrompt(guildId: string, situation: SituationType): boolean {
  return getSituationPrompt(guildId, situation) !== null;
}

export function getCustomPromptText(guildId: string, situation: SituationType): string | null {
  const prompt = getSituationPrompt(guildId, situation);
  return prompt?.prompt_text ?? null;
}

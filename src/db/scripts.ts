import { db } from './index.ts';
import { scripts } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

export interface ScriptInput {
  id: string;
  title: string;
  episodeTag?: string;
  category: 'active' | 'draft' | 'template';
  content: string;
  pacingWpm: number;
  wordCount: number;
  estimatedReadTime: string;
  updatedAt: string;
}

export async function getScriptsByUserId(userId: string) {
  try {
    return await db
      .select()
      .from(scripts)
      .where(eq(scripts.userId, userId))
      .orderBy(desc(scripts.createdAt));
  } catch (error) {
    console.error("Failed to fetch scripts:", error);
    throw new Error("Failed to load scripts.", { cause: error });
  }
}

export async function upsertScript(userId: string, data: ScriptInput) {
  try {
    const [result] = await db
      .insert(scripts)
      .values({
        id: data.id,
        userId,
        title: data.title,
        episodeTag: data.episodeTag || null,
        category: data.category,
        content: data.content,
        pacingWpm: data.pacingWpm,
        wordCount: data.wordCount,
        estimatedReadTime: data.estimatedReadTime,
        updatedAt: data.updatedAt,
      })
      .onConflictDoUpdate({
        target: scripts.id,
        set: {
          title: data.title,
          episodeTag: data.episodeTag || null,
          category: data.category,
          content: data.content,
          pacingWpm: data.pacingWpm,
          wordCount: data.wordCount,
          estimatedReadTime: data.estimatedReadTime,
          updatedAt: data.updatedAt,
        },
      })
      .returning();
    return result;
  } catch (error) {
    console.error("Failed to save script:", error);
    throw new Error("Failed to save script.", { cause: error });
  }
}

export async function deleteScriptById(userId: string, scriptId: string) {
  try {
    return await db
      .delete(scripts)
      .where(eq(scripts.id, scriptId));
  } catch (error) {
    console.error("Failed to delete script:", error);
    throw new Error("Failed to delete script.", { cause: error });
  }
}

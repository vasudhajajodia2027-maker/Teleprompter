import { db } from './index.ts';
import { waitlist } from './schema.ts';

export async function addToWaitlist(email: string) {
  try {
    const [result] = await db
      .insert(waitlist)
      .values({ email: email.toLowerCase().trim() })
      .onConflictDoNothing()
      .returning();
    return result || { email };
  } catch (error) {
    console.error("Failed to add to waitlist:", error);
    throw new Error("Failed to save to waitlist.", { cause: error });
  }
}

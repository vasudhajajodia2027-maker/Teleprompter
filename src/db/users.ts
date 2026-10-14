import { db } from './index.ts';
import { users, licenses } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    // Ensure license record exists for user
    await db.insert(licenses)
      .values({
        userId: uid,
        isPro: false,
        tier: 'Free Tier',
      })
      .onConflictDoNothing();

    return result[0];
  } catch (error) {
    console.error("Failed to get or create user:", error);
    throw new Error("User registration failed.", { cause: error });
  }
}

export async function getUserLicense(uid: string) {
  try {
    const [userLicense] = await db
      .select()
      .from(licenses)
      .where(eq(licenses.userId, uid));

    return userLicense || { isPro: false, licenseKey: null, tier: 'Free Tier' };
  } catch (error) {
    console.error("Failed to fetch user license:", error);
    throw new Error("Failed to fetch license.", { cause: error });
  }
}

export async function activateUserLicense(uid: string, licenseKey: string) {
  try {
    const [updated] = await db
      .insert(licenses)
      .values({
        userId: uid,
        isPro: true,
        licenseKey,
        tier: 'Perpetual Studio ($19)',
        activatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: licenses.userId,
        set: {
          isPro: true,
          licenseKey,
          tier: 'Perpetual Studio ($19)',
          activatedAt: new Date(),
        },
      })
      .returning();
    return updated;
  } catch (error) {
    console.error("Failed to activate license:", error);
    throw new Error("Failed to activate license.", { cause: error });
  }
}

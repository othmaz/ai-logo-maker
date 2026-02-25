const { sql } = require('./db')

async function ensureUserExists(clerkUserId, email = null) {
  const { rows } = await sql`
    INSERT INTO users (clerk_user_id, email)
    VALUES (${clerkUserId}, ${email})
    ON CONFLICT (clerk_user_id) DO UPDATE SET email = COALESCE(EXCLUDED.email, users.email)
    RETURNING id
  `
  return rows[0]
}

async function migrateSavedLogos(userId, savedLogos) {
  for (const logo of savedLogos) {
    await sql`
      INSERT INTO saved_logos (user_id, clerk_user_id, logo_url, logo_prompt)
      VALUES (${userId}, NULL, ${logo.url || logo.logo_url}, ${logo.prompt || null})
      ON CONFLICT DO NOTHING
    `
  }
}

async function migrateUsageData(userId, creditsUsed) {
  await sql`
    UPDATE users SET credits_used = ${creditsUsed}
    WHERE id = ${userId}
  `
}

async function migrateFromLocalStorage(clerkUserId, localStorageData, email = null) {
  try {
    const user = await ensureUserExists(clerkUserId, email)
    if (localStorageData.savedLogos) {
      await migrateSavedLogos(user.id, localStorageData.savedLogos)
    }
    const creditsToMigrate = Number(
      localStorageData?.creditsUsed ?? localStorageData?.generationsUsed ?? 0
    )

    if (creditsToMigrate > 0) {
      await migrateUsageData(user.id, creditsToMigrate)
    }
    return { success: true, message: 'Migration completed' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

module.exports = {
  ensureUserExists,
  migrateSavedLogos,
  migrateUsageData,
  migrateFromLocalStorage,
}



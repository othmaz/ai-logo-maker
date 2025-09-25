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

async function migrateUsageData(userId, generationsUsed) {
  await sql`
    UPDATE users SET generations_used = ${generationsUsed}
    WHERE id = ${userId}
  `
}

async function migrateFromLocalStorage(clerkUserId, localStorageData, email = null) {
  try {
    const user = await ensureUserExists(clerkUserId, email)
    if (localStorageData.savedLogos) {
      await migrateSavedLogos(user.id, localStorageData.savedLogos)
    }
    if (localStorageData.generationsUsed) {
      await migrateUsageData(user.id, localStorageData.generationsUsed)
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



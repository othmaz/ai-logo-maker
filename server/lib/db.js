const { sql } = require('@vercel/postgres')

async function connectToDatabase() {
  try {
    const { rows } = await sql`SELECT NOW()`
    console.log('Database connected:', rows[0])
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

module.exports = { sql, connectToDatabase }



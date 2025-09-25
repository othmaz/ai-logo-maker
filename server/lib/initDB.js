const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  try {
    console.log('🗄️ Initializing database schema...');

    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = schema.split(';').filter(statement => statement.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        await sql.query(statement.trim());
      }
    }

    console.log('✅ Database schema initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

module.exports = { initializeDatabase };
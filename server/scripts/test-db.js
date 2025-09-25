#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the correct .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { connectToDatabase, sql } = require('../lib/db');
const { initializeDatabase } = require('../lib/initDB');

async function testDatabase() {
  console.log('🧪 Testing database connection and setup...\n');

  try {
    // 1. Test connection
    console.log('1. Testing database connection...');
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }
    console.log('✅ Database connected successfully\n');

    // 2. Initialize schema
    console.log('2. Initializing database schema...');
    const schemaInitialized = await initializeDatabase();
    if (!schemaInitialized) {
      throw new Error('Failed to initialize schema');
    }
    console.log('✅ Database schema initialized\n');

    // 3. Test queries
    console.log('3. Testing database queries...');

    // Count existing users
    const { rows: userCount } = await sql`SELECT COUNT(*) as count FROM users`;
    console.log(`📊 Users in database: ${userCount[0].count}`);

    // Count existing logos
    const { rows: logoCount } = await sql`SELECT COUNT(*) as count FROM saved_logos`;
    console.log(`📊 Saved logos in database: ${logoCount[0].count}`);

    // Count generation history
    const { rows: genCount } = await sql`SELECT COUNT(*) as count FROM generation_history`;
    console.log(`📊 Generation history entries: ${genCount[0].count}`);

    // Count analytics
    const { rows: analyticsCount } = await sql`SELECT COUNT(*) as count FROM usage_analytics`;
    console.log(`📊 Analytics entries: ${analyticsCount[0].count}`);

    console.log('\n🎉 Database test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start your server: npm run server');
    console.log('2. Start your client: npm run dev');
    console.log('3. Sign in to trigger user sync and migration');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check your .env file has POSTGRES_URL');
    console.error('2. Verify your Vercel Postgres database is active');
    console.error('3. Check network connectivity');
    process.exit(1);
  }
}

testDatabase();
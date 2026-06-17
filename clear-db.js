const { Client } = require('pg');

async function clearDB() {
  const client = new Client({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'smartfolio',
    password: 'postgres',
    port: 5432,
  });

  try {
    await client.connect();
    console.log('Connected to database...');
    await client.query('DROP SCHEMA public CASCADE;');
    await client.query('CREATE SCHEMA public;');
    console.log('Database schema successfully cleared! All data is wiped.');
    console.log('NestJS will automatically recreate the tables on next startup.');
  } catch (err) {
    console.error('Error clearing database:', err);
  } finally {
    await client.end();
  }
}

clearDB();

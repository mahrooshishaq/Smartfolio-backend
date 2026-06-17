const { Client } = require('pg');

async function recreateDB() {
  const client = new Client({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'postgres', // Connect to default DB to drop the other one
    password: 'postgres',
    port: 5432,
  });

  try {
    await client.connect();
    console.log('Connected to postgres default db...');
    
    // Disconnect other sessions first if any
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'smartfolio'
        AND pid <> pg_backend_pid();
    `);
    
    await client.query('DROP DATABASE IF EXISTS smartfolio;');
    await client.query("CREATE DATABASE smartfolio WITH TEMPLATE template0 ENCODING 'UTF8';");
    console.log('Database smartfolio successfully recreated with UTF8 encoding!');
    console.log('NestJS will automatically recreate the tables on next startup.');
  } catch (err) {
    console.error('Error recreating database:', err);
  } finally {
    await client.end();
  }
}

recreateDB();

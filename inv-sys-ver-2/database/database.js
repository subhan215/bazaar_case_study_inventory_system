import { Pool } from "pg";

// PostgreSQL pool setup for the Primary (Write) Database
const primaryPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT, // Port 5432 for write access
});

// PostgreSQL pool setup for the Replica (Read) Database
const replicaPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_READ_PORT, // Port 5433 for read-only access
});

// Export both pools
export { primaryPool, replicaPool };

import { drizzle } from 'drizzle-orm/neon-http';

const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@db.example.com/dbname?sslmode=require';

export const db = drizzle(connectionString);

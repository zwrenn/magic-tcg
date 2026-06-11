import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js uses .env.local; load it (then plain .env) so drizzle-kit sees DATABASE_URL.
config({ path: ".env.local" });
config();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});

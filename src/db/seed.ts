import { config } from "dotenv";

// Load env BEFORE importing the db client (it throws if DATABASE_URL is unset).
config({ path: ".env.local" });
config();

const POD = ["Zoe", "Halie", "Troy", "Mike"];

async function main() {
  const { db, schema } = await import("./index");

  await db
    .insert(schema.users)
    .values(POD.map((name) => ({ name })))
    .onConflictDoNothing({ target: schema.users.name });

  const rows = await db.select().from(schema.users);
  console.log(
    `Seeded ${POD.length} pod members. Users in DB:`,
    rows.map((r) => `${r.id}:${r.name}`).join(", "),
  );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  },
);

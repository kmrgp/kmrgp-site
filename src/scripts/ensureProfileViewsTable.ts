/**
 * One-off: create profile_views table (safe to re-run).
 * Run: bun --env-file=.env.local src/scripts/ensureProfileViewsTable.ts
 */
import postgres from "postgres"

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS profile_views (
      id serial PRIMARY KEY,
      profile_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      viewer_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      viewed_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS profile_views_profile_user_idx ON profile_views (profile_user_id)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS profile_views_viewer_idx ON profile_views (viewer_id)
  `
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS profile_views_profile_viewer_idx
      ON profile_views (profile_user_id, viewer_id)
  `
  const [{ count }] = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM profile_views`
  console.log(`profile_views ready (${count} rows)`)
  await sql.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

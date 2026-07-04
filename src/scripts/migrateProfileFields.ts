import { sql } from "drizzle-orm"
import { db } from "@/lib/db"

const COLUMNS = [
  `ADD COLUMN IF NOT EXISTS gender varchar(20)`,
  `ADD COLUMN IF NOT EXISTS current_education varchar(255)`,
  `ADD COLUMN IF NOT EXISTS company_name varchar(255)`,
  `ADD COLUMN IF NOT EXISTS father_occupation varchar(255)`,
  `ADD COLUMN IF NOT EXISTS mother_occupation varchar(255)`,
  `ADD COLUMN IF NOT EXISTS guardian_mobile varchar(20)`,
  `ADD COLUMN IF NOT EXISTS whatsapp_number varchar(20)`,
  `ADD COLUMN IF NOT EXISTS cast_certificate_path varchar(500)`,
  `ADD COLUMN IF NOT EXISTS hobbies text`,
  `ADD COLUMN IF NOT EXISTS additional_details text`,
]

async function main() {
  for (const clause of COLUMNS) {
    await db.execute(sql.raw(`ALTER TABLE profiles ${clause}`))
    console.log(`✓ profiles ${clause.split(" ")[3]}`)
  }
  console.log("✅ Profile field migration complete.")
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

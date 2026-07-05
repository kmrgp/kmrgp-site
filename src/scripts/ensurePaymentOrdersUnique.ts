/**
 * Align payment_orders.razorpay_order_id with schema (.unique()).
 * Run: bun --env-file=.env.local src/scripts/ensurePaymentOrdersUnique.ts
 */
import postgres from "postgres"

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

async function main() {
  const dupes = await sql<{ razorpay_order_id: string; n: string }[]>`
    SELECT razorpay_order_id, count(*)::text AS n
    FROM payment_orders
    GROUP BY razorpay_order_id
    HAVING count(*) > 1
  `
  if (dupes.length > 0) {
    console.error("Duplicate razorpay_order_id values block unique constraint:", dupes)
    process.exit(1)
  }

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_razorpay_order_id_unique
      ON payment_orders (razorpay_order_id)
  `
  console.log("payment_orders razorpay_order_id unique index OK")
  await sql.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

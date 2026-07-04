/**
 * Create subscription tables + default ₹501/year plan.
 * Run: bun run db:migrate-subscriptions
 */
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { ensureDefaultPlan } from "@/lib/services/subscriptionPlanService"

async function main() {
  console.log("Applying subscription schema...")

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE payment_order_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id serial PRIMARY KEY,
      name varchar(120) NOT NULL,
      description text,
      amount_inr integer NOT NULL,
      duration_days integer NOT NULL DEFAULT 365,
      active boolean NOT NULL DEFAULT true,
      is_default boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id serial PRIMARY KEY,
      razorpay_order_id varchar(100) NOT NULL UNIQUE,
      plan_id integer NOT NULL REFERENCES subscription_plans(id),
      amount_paise integer NOT NULL,
      status payment_order_status NOT NULL DEFAULT 'PENDING',
      registration_payload text NOT NULL,
      user_id integer REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      paid_at timestamptz
    );
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS profile_subscriptions (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id integer NOT NULL REFERENCES subscription_plans(id),
      payment_order_id integer REFERENCES payment_orders(id) ON DELETE SET NULL,
      razorpay_payment_id varchar(100),
      status subscription_status NOT NULL DEFAULT 'ACTIVE',
      amount_paid_paise integer NOT NULL,
      starts_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `)

  await ensureDefaultPlan()
  console.log("✅ Subscription schema ready (default plan: ₹501/year).")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

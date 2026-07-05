import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core"

export const roleEnum = pgEnum("role", ["USER", "ADMIN", "SUPER_ADMIN"])
export const profileTypeEnum = pgEnum("profile_type", ["GROOM", "BRIDE"])
export const approvalStatusEnum = pgEnum("approval_status", [
  "SENT",
  "PENDING",
  "APPROVED",
  "REJECTED",
])
export const actionTypeEnum = pgEnum("action_type", ["APPROVE", "REJECT", "DELETE"])
export const interestStatusEnum = pgEnum("interest_status", ["PENDING", "ACCEPTED", "DECLINED"])
export const contactRequestStatusEnum = pgEnum("contact_request_status", ["PENDING", "APPROVED", "REJECTED"])
export const paymentOrderStatusEnum = pgEnum("payment_order_status", ["PENDING", "PAID", "FAILED", "EXPIRED"])
export const subscriptionStatusEnum = pgEnum("subscription_status", ["ACTIVE", "EXPIRED", "CANCELLED"])

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    phone: varchar("phone", { length: 20 }).notNull().unique(),
    username: varchar("username", { length: 80 }).unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).unique(),
    role: roleEnum("role").notNull().default("USER"),
    isApproved: boolean("is_approved").notNull().default(false),
    emailVerified: boolean("email_verified").notNull().default(true),
    // Soft-delete: when set, the user is hidden from all queries but the row is
    // retained for audit/recovery. Hard delete is reserved for forced cleanup.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    phoneIdx: index("users_phone_idx").on(table.phone),
    usernameIdx: index("users_username_idx").on(table.username),
    approvedIdx: index("users_is_approved_idx").on(table.isApproved),
  })
)

export const profiles = pgTable(
  "profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    type: profileTypeEnum("type").notNull(),
    bio: text("bio").default(""),
    visible: boolean("visible").notNull().default(false),
    /** Official demo/seed profile — admin can bulk-hide when real members join. */
    isSeed: boolean("is_seed").notNull().default(false),
    /** Shown in home-page featured section (admin-selected). */
    featured: boolean("featured").notNull().default(false),
    approvalStatus: approvalStatusEnum("approval_status").notNull().default("SENT"),
    imagePath: varchar("image_path", { length: 500 }),

    dob: varchar("dob", { length: 50 }),
    height: varchar("height", { length: 20 }),
    gotraSelf: varchar("gotra_self", { length: 80 }),
    gotraMother: varchar("gotra_mother", { length: 80 }),
    education: varchar("education", { length: 255 }),
    profession: varchar("profession", { length: 255 }),
    district: varchar("district", { length: 80 }),
    community: varchar("community", { length: 80 }).notNull().default("Mewada"),

    fatherName: varchar("father_name", { length: 100 }),
    motherName: varchar("mother_name", { length: 100 }),
    address: varchar("address", { length: 255 }),
    contact: varchar("contact", { length: 20 }),
    brothers: varchar("brothers", { length: 50 }),
    sisters: varchar("sisters", { length: 50 }),
    familyType: varchar("family_type", { length: 80 }),
    parentsOccupation: varchar("parents_occupation", { length: 255 }),
    gender: varchar("gender", { length: 20 }),
    currentEducation: varchar("current_education", { length: 255 }),
    companyName: varchar("company_name", { length: 255 }),
    fatherOccupation: varchar("father_occupation", { length: 255 }),
    motherOccupation: varchar("mother_occupation", { length: 255 }),
    guardianMobile: varchar("guardian_mobile", { length: 20 }),
    whatsappNumber: varchar("whatsapp_number", { length: 20 }),
    castCertificatePath: varchar("cast_certificate_path", { length: 500 }),
    hobbies: text("hobbies"),
    additionalDetails: text("additional_details"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("profiles_user_id_idx").on(table.userId),
    visibleIdx: index("profiles_visible_idx").on(table.visible),
    featuredIdx: index("profiles_featured_idx").on(table.featured),
    isSeedIdx: index("profiles_is_seed_idx").on(table.isSeed),
    statusIdx: index("profiles_status_idx").on(table.approvalStatus),
  })
)

export const adminActionLogs = pgTable(
  "admin_action_logs",
  {
    id: serial("id").primaryKey(),
    adminId: integer("admin_id").references(() => users.id, { onDelete: "set null" }),
    actionType: actionTypeEnum("action_type").notNull(),
    targetUserId: integer("target_user_id").references(() => users.id, { onDelete: "set null" }),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    adminIdIdx: index("logs_admin_id_idx").on(table.adminId),
    targetUserIdIdx: index("logs_target_user_id_idx").on(table.targetUserId),
    timestampIdx: index("logs_timestamp_idx").on(table.timestamp),
  })
)

export const interests = pgTable(
  "interests",
  {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    receiverId: integer("receiver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: interestStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    receiverIdx: index("interests_receiver_idx").on(table.receiverId),
    senderIdx: index("interests_sender_idx").on(table.senderId),
    uniquePair: uniqueIndex("interests_sender_receiver_idx").on(table.senderId, table.receiverId),
  })
)

export const contactRequests = pgTable(
  "contact_requests",
  {
    id: serial("id").primaryKey(),
    requesterId: integer("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: contactRequestStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    requesterIdx: index("contact_requests_requester_idx").on(table.requesterId),
    ownerIdx: index("contact_requests_owner_idx").on(table.ownerId),
    statusIdx: index("contact_requests_status_idx").on(table.status),
    uniqueRequest: uniqueIndex("contact_requests_requester_owner_idx").on(table.requesterId, table.ownerId),
  })
)

export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    /** Whole rupees (e.g. 501). Charged as amount * 100 paise at checkout. */
    amountInr: integer("amount_inr").notNull(),
    durationDays: integer("duration_days").notNull().default(365),
    active: boolean("active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    activeIdx: index("subscription_plans_active_idx").on(table.active),
    defaultIdx: index("subscription_plans_default_idx").on(table.isDefault),
  })
)

export const paymentOrders = pgTable(
  "payment_orders",
  {
    id: serial("id").primaryKey(),
    razorpayOrderId: varchar("razorpay_order_id", { length: 100 }).notNull().unique(),
    planId: integer("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id),
    amountPaise: integer("amount_paise").notNull(),
    status: paymentOrderStatusEnum("status").notNull().default("PENDING"),
    /** JSON blob of registration fields — consumed after successful payment. */
    registrationPayload: text("registration_payload").notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => ({
    statusIdx: index("payment_orders_status_idx").on(table.status),
    razorpayIdx: index("payment_orders_razorpay_idx").on(table.razorpayOrderId),
  })
)

export const profileSubscriptions = pgTable(
  "profile_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: integer("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id),
    paymentOrderId: integer("payment_order_id").references(() => paymentOrders.id, {
      onDelete: "set null",
    }),
    razorpayPaymentId: varchar("razorpay_payment_id", { length: 100 }),
    status: subscriptionStatusEnum("status").notNull().default("ACTIVE"),
    amountPaidPaise: integer("amount_paid_paise").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("profile_subscriptions_user_idx").on(table.userId),
    statusIdx: index("profile_subscriptions_status_idx").on(table.status),
    expiresIdx: index("profile_subscriptions_expires_idx").on(table.expiresAt),
  })
)

/** Logged-in member opened another member's profile (unique viewer per profile). */
export const profileViews = pgTable(
  "profile_views",
  {
    id: serial("id").primaryKey(),
    profileUserId: integer("profile_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    viewerId: integer("viewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileUserIdx: index("profile_views_profile_user_idx").on(table.profileUserId),
    viewerIdx: index("profile_views_viewer_idx").on(table.viewerId),
    uniqueView: uniqueIndex("profile_views_profile_viewer_idx").on(table.profileUserId, table.viewerId),
  })
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
export type AdminActionLog = typeof adminActionLogs.$inferSelect
export type NewAdminActionLog = typeof adminActionLogs.$inferInsert
export type Interest = typeof interests.$inferSelect
export type NewInterest = typeof interests.$inferInsert
export type ContactRequest = typeof contactRequests.$inferSelect
export type NewContactRequest = typeof contactRequests.$inferInsert
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert
export type PaymentOrder = typeof paymentOrders.$inferSelect
export type ProfileSubscription = typeof profileSubscriptions.$inferSelect
export type ProfileView = typeof profileViews.$inferSelect
export type NewProfileView = typeof profileViews.$inferInsert

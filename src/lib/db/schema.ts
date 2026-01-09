import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, real, pgEnum } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const memberStatusEnum = pgEnum('member_status', ['active', 'inactive', 'churned', 'paused'])
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'trial', 'converted', 'lost'])
export const riskLevelEnum = pgEnum('risk_level', ['low', 'medium', 'high', 'critical'])
export const actionStatusEnum = pgEnum('action_status', ['pending', 'completed', 'skipped'])

export const gyms = pgTable('gyms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  location: text('location'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  settings: jsonb('settings').default({})
})

export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id').references(() => gyms.id).notNull(),
  externalId: text('external_id').notNull(), // ID from gym's CRM
  email: text('email').notNull(),
  phone: text('phone'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  status: memberStatusEnum('status').default('active').notNull(),
  joinDate: timestamp('join_date').notNull(),
  lastCheckIn: timestamp('last_check_in'),
  checkInCount30Days: integer('check_in_count_30_days').default(0),
  checkInCount90Days: integer('check_in_count_90_days').default(0),
  averageWeeklyCheckIns: real('average_weekly_check_ins').default(0),
  membershipType: text('membership_type'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id').references(() => gyms.id).notNull(),
  externalId: text('external_id'),
  email: text('email').notNull(),
  phone: text('phone'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  source: text('source'), // 'website', 'walk-in', 'referral', etc
  status: leadStatusEnum('status').default('new').notNull(),
  firstContactDate: timestamp('first_contact_date').defaultNow().notNull(),
  lastContactDate: timestamp('last_contact_date'),
  trialStartDate: timestamp('trial_start_date'),
  conversionDate: timestamp('conversion_date'),
  lostReason: text('lost_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const riskScores = pgTable('risk_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  score: real('score').notNull(), // 0-100
  level: riskLevelEnum('level').notNull(),
  factors: jsonb('factors').notNull(), // Array of contributing factors
  predictedChurnDate: timestamp('predicted_churn_date'),
  confidence: real('confidence').notNull(), // 0-1
  calculatedAt: timestamp('calculated_at').defaultNow().notNull()
})

export const actions = pgTable('actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id').references(() => gyms.id).notNull(),
  memberId: uuid('member_id').references(() => members.id),
  leadId: uuid('lead_id').references(() => leads.id),
  type: text('type').notNull(), // 'call', 'whatsapp', 'email', 'in_person'
  priority: integer('priority').notNull(), // 1-5
  title: text('title').notNull(),
  description: text('description'),
  suggestedMessage: text('suggested_message'),
  status: actionStatusEnum('status').default('pending').notNull(),
  assignedTo: text('assigned_to'),
  dueDate: timestamp('due_date').notNull(),
  completedAt: timestamp('completed_at'),
  completedBy: text('completed_by'),
  outcome: text('outcome'),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const checkIns = pgTable('check_ins', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  checkInTime: timestamp('check_in_time').notNull(),
  duration: integer('duration'), // in minutes
  activityType: text('activity_type'), // 'gym', 'class', 'pt_session'
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const communications = pgTable('communications', {
  id: uuid('id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id').references(() => gyms.id).notNull(),
  memberId: uuid('member_id').references(() => members.id),
  leadId: uuid('lead_id').references(() => leads.id),
  channel: text('channel').notNull(), // 'whatsapp', 'sms', 'email'
  direction: text('direction').notNull(), // 'inbound', 'outbound'
  message: text('message').notNull(),
  sentBy: text('sent_by'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const patterns = pgTable('patterns', {
  id: uuid('id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id').references(() => gyms.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  conditions: jsonb('conditions').notNull(), // Detection rules
  riskImpact: real('risk_impact').notNull(), // How much this affects risk score
  isActive: boolean('is_active').default(true).notNull(),
  detectedCount: integer('detected_count').default(0),
  successRate: real('success_rate'), // % of times intervention worked
  createdAt: timestamp('created_at').defaultNow().notNull()
})
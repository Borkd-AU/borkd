import { z } from 'zod';
import type { PinCategory } from '../types';

// ── Reusable pieces ────────────────────────────────────────────

export const gpsCoordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const gpsLineStringSchema = z.array(gpsCoordinateSchema).min(2);

const pinCategorySchema = z.enum([
  'good_spot',
  'hazard',
  'amenity',
  'wildlife',
]) satisfies z.ZodType<PinCategory>;

// ── User schemas ───────────────────────────────────────────────

export const createUserSchema = z.object({
  display_name: z.string().trim().min(1).max(100),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores')
    .nullish(),
  avatar_url: z.string().url().nullish(),
  suburb: z.string().trim().max(100).nullish(),
  bio: z.string().trim().max(500).nullish(),
});

export const updateUserSchema = createUserSchema.partial();

// ── Dog schemas ────────────────────────────────────────────────

export const createDogSchema = z.object({
  name: z.string().trim().min(1).max(50),
  breed: z.string().trim().max(100).nullish(),
  age_years: z.number().min(0).max(30).nullish(),
  weight_kg: z.number().min(0).max(200).nullish(),
  personality_tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  avatar_url: z.string().url().nullish(),
  is_primary: z.boolean().default(false),
});

export const updateDogSchema = createDogSchema.partial();

// ── Walk schemas ───────────────────────────────────────────────

export const createWalkSchema = z.object({
  started_at: z.string().datetime(),
  dog_id: z.string().uuid().nullish(),
  note: z.string().trim().max(500).nullish(),
  weather_condition: z.string().trim().max(50).nullish(),
});

export const updateWalkSchema = z.object({
  ended_at: z.string().datetime().nullish(),
  duration_seconds: z.number().int().min(0).nullish(),
  distance_km: z.number().min(0).nullish(),
  route_geometry: gpsLineStringSchema.nullish(),
  average_pace: z.number().min(0).nullish(),
  calories_estimated: z.number().int().min(0).nullish(),
  miles_earned: z.number().int().min(0).optional(),
  weather_condition: z.string().trim().max(50).nullish(),
  note: z.string().trim().max(500).nullish(),
  is_active: z.boolean().optional(),
});

// ── Pin schemas ────────────────────────────────────────────────

export const createPinSchema = z.object({
  category: pinCategorySchema,
  note: z.string().trim().min(1).max(500),
  location: gpsCoordinateSchema,
  walk_id: z.string().uuid().nullish(),
  photo_url: z.string().url().nullish(),
});

export const updatePinSchema = z.object({
  note: z.string().trim().min(1).max(500).optional(),
  photo_url: z.string().url().nullish(),
  category: pinCategorySchema.optional(),
});

// ── Inferred types (for convenience) ───────────────────────────

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateDogInput = z.infer<typeof createDogSchema>;
export type UpdateDogInput = z.infer<typeof updateDogSchema>;
export type CreateWalkInput = z.infer<typeof createWalkSchema>;
export type UpdateWalkInput = z.infer<typeof updateWalkSchema>;
export type CreatePinInput = z.infer<typeof createPinSchema>;
export type UpdatePinInput = z.infer<typeof updatePinSchema>;

import { z } from 'zod'
import { LIMITS } from '@/constants/shop'

const text = (label: string, max: number) =>
  z.string().trim().min(1, `Enter ${label}`).max(max, `${label[0].toUpperCase()}${label.slice(1)} is too long`)

/** Shared by the checkout form and POST /api/orders. */
export const orderSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().min(1).max(LIMITS.maxQuantityPerLine),
        }),
      )
      .min(1, 'Your cart is empty')
      .max(LIMITS.maxCartLines),
    email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
    fullName: text('your full name', LIMITS.nameMax),
    addressLine1: text('your address', LIMITS.addressMax),
    addressLine2: z.string().trim().max(LIMITS.addressMax).optional().default(''),
    city: text('your city', 100),
    region: z.string().trim().max(100).optional().default(''),
    postalCode: text('your postal code', 20),
    country: text('your country', 56),
  })
  .strict()

export type OrderInput = z.infer<typeof orderSchema>

export const registerSchema = z
  .object({
    fullName: text('your full name', LIMITS.nameMax),
    email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
    // bcrypt ignores everything past 72 bytes, so 72 is the honest maximum.
    password: z.string().min(8, 'Use at least 8 characters').max(72, 'Use at most 72 characters'),
  })
  .strict()

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
    password: z.string().min(1, 'Enter your password').max(72),
  })
  .strict()

import { z } from 'zod'
import { LIMITS } from '@/constants/shop'
import { CATEGORIES } from '@/lib/catalog'

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
    discountCode: z.string().trim().max(20).optional().transform((v) => (v ? v.toUpperCase() : undefined)),
    saveAddress: z.boolean().optional(),
  })
  .strict()

export type OrderInput = z.infer<typeof orderSchema>

export const registerSchema = z
  .object({
    fullName: text('your full name', LIMITS.nameMax),
    email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
    password: z.string().min(8, 'Use at least 8 characters').max(72, 'Use at most 72 characters'), // same rule as newPasswordField
  })
  .strict()

/** The rule for any new password, shared by sign-up, reset and the forms (bcrypt ignores everything past 72 bytes). */
export const newPasswordField = z.string().min(8, 'Use at least 8 characters').max(72, 'Use at most 72 characters')

export const forgotPasswordSchema = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254) }).strict()
export const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), newPassword: newPasswordField }).strict()
export const tokenSchema = z.object({ token: z.string().min(20).max(200) }).strict()

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
    password: z.string().min(1, 'Enter your password').max(72),
  })
  .strict()

export const reviewSchema = z
  .object({
    rating: z.number().int('Choose a rating').min(1, 'Choose a rating').max(5, 'Choose a rating'),
    body: z.string().trim().max(1000, 'Keep the review under 1000 characters').optional().default(''),
  })
  .strict()

export const addressSchema = z
  .object({
    label: z.string().trim().max(30).optional().default(''),
    fullName: text('the full name', LIMITS.nameMax),
    addressLine1: text('the address', LIMITS.addressMax),
    addressLine2: z.string().trim().max(LIMITS.addressMax).optional().default(''),
    city: text('the city', 100),
    region: z.string().trim().max(100).optional().default(''),
    postalCode: text('the postal code', 20),
    country: text('the country', 56),
    isDefault: z.boolean().optional().default(false),
  })
  .strict()

export const notifySchema = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254) }).strict()

export const discountCreateSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,20}$/, 'Use 3 to 20 letters, numbers, - or _'),
    percentOff: z.number().int().min(1).max(90).optional(),
    amountOffNaira: z.number().int().min(1).max(10_000_000).optional(),
    maxUses: z.number().int().min(1).max(1_000_000).optional(),
    expiresAt: z.string().trim().optional(),
  })
  .strict()
  .refine((d) => (d.percentOff != null) !== (d.amountOffNaira != null), { message: 'Choose a percentage OR an amount', path: ['percentOff'] })
  .refine((d) => !d.expiresAt || !Number.isNaN(Date.parse(d.expiresAt)), { message: 'Enter a valid date', path: ['expiresAt'] })

export const productCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'Give the product a name').max(120, 'The name is too long'),
    description: z.string().trim().max(2000, 'The description is too long').optional().default(''),
    priceNaira: z.number().int('Enter the price in whole naira').min(1, 'Enter a price').max(100_000_000, 'That price is too high'),
    stock: z.number().int('Enter a whole number').min(0).max(100000),
    category: z.enum(CATEGORIES.map((c) => c.slug) as [string, ...string[]], 'Choose a category'),
  })
  .strict()

export const zoneCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'Give the zone a name').max(60),
    country: z.string().trim().min(1, 'Enter a country, or * for everywhere else').max(56),
    region: z.string().trim().max(60).optional(),
    feeNaira: z.number().int().min(0).max(1_000_000),
    freeOverNaira: z.number().int().min(1).max(100_000_000).optional(),
  })
  .strict()

export const zonePatchSchema = z
  .object({
    feeNaira: z.number().int().min(0).max(1_000_000).optional(),
    freeOverNaira: z.number().int().min(1).max(100_000_000).nullable().optional(),
    active: z.boolean().optional(),
  })
  .strict()

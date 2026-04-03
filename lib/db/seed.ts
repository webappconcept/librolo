import { hashPassword } from "@/lib/auth/session";
import { getStripe } from "../payments/stripe";
import { db } from "./drizzle";
import { users } from "./schema";

async function createStripeProducts() {
  const stripe = getStripe();
  console.log("Creating Stripe products and prices...");

  const baseProduct = await stripe.products.create({
    name: "Base",
    description: "Base subscription plan",
  });

  await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800,
    currency: "usd",
    recurring: {
      interval: "month",
      trial_period_days: 7,
    },
  });

  const plusProduct = await stripe.products.create({
    name: "Plus",
    description: "Plus subscription plan",
  });

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200,
    currency: "usd",
    recurring: {
      interval: "month",
      trial_period_days: 7,
    },
  });

  console.log("Stripe products and prices created successfully.");
}

async function seed() {
  const [user] = await db
    .insert(users)
    .values({
      email: "test@test.com",
      passwordHash: await hashPassword("admin123"),
      role: "owner",
    })
    .returning();

  console.log("Initial user created:", user.email);

  await createStripeProducts();
}

seed()
  .catch((error) => {
    console.error("Seed process failed:", error);
    process.exit(1);
  })
  .finally(() => {
    console.log("Seed process finished. Exiting...");
    process.exit(0);
  });

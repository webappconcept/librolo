"use server";

import { getUser } from "@/lib/db/queries";
import { redirect } from "next/navigation";
import { createCheckoutSession, createCustomerPortalSession } from "./stripe";

export async function checkoutAction(formData: FormData) {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  const priceId = formData.get("priceId") as string;
  await createCheckoutSession({ user, priceId });
}

export async function customerPortalAction() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  const portalSession = await createCustomerPortalSession(user);
  redirect(portalSession.url);
}

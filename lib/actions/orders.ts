"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  sendOrderProcessingEmail,
  sendOrderShippedEmail,
} from "@/lib/email-service";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorise");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Non autorise");
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    await checkAdmin();
    const adminSupabase = createAdminClient();

    // Fetch current status before updating — email only sent on genuine transition
    const { data: current } = await adminSupabase
      .from("orders")
      .select("status, shipping_address, user_id")
      .eq("id", orderId)
      .single();

    const previousStatus = current?.status;

    const { error } = await adminSupabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) return { error: error.message };

    const isNewTransition = status !== previousStatus;

    if (isNewTransition && (status === "processing" || status === "shipped")) {
      const order = current;

      let customerEmail: string | undefined = order?.shipping_address?.email;

      if (!customerEmail && order?.user_id) {
        const { data: profile } = await adminSupabase
          .from("profiles")
          .select("email")
          .eq("id", order.user_id)
          .single();
        customerEmail = profile?.email ?? undefined;
      }

      if (customerEmail) {
        const ref = orderId.slice(0, 8).toUpperCase();
        const name = order?.shipping_address?.full_name;
        const address = order?.shipping_address;

        if (status === "processing") {
          await sendOrderProcessingEmail({ to: customerEmail, orderRef: ref, customerName: name });
        } else {
          await sendOrderShippedEmail({ to: customerEmail, orderRef: ref, customerName: name, shippingAddress: address });
        }
      }
    }

    revalidatePath("/admin/orders");
    revalidatePath("/admin/boutique");
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Non autorise" };
  }
}

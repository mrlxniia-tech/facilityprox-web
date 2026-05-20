import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const createSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(72),
  fullName: z.string().trim().min(1).max(120),
  role: z.enum(["admin", "owner", "client"]),
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Verify caller is admin
    const { data: rolesRows, error: rolesErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (rolesErr) throw new Error(rolesErr.message);
    const isAdmin = (rolesRows ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Réservé aux administrateurs");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);
    const newId = created.user!.id;

    // handle_new_user trigger already inserted 'client' role + profile.
    if (data.role !== "client") {
      const { error: rErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newId, role: data.role });
      if (rErr && !rErr.message.includes("duplicate")) throw new Error(rErr.message);
    }
    return { ok: true, id: newId };
  });

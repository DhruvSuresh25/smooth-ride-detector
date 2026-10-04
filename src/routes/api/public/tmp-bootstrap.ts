import { createFileRoute } from "@tanstack/react-router";

// TEMPORARY one-off route; deleted right after use.
export const Route = createFileRoute("/api/public/tmp-bootstrap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get("x-once") !== "k9Qz7vT2mX4pL8wR1nB6") return new Response("no", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: "dhruvva.suresh@gmail.com",
          password: "SadaRR@1234$",
          email_confirm: true,
          user_metadata: { full_name: "Dhruvva Suresh" },
        });
        if (error || !data.user) return new Response(error?.message ?? "fail", { status: 500 });
        const id = data.user.id;
        await supabaseAdmin.from("profiles").upsert({ id, full_name: "Dhruvva Suresh", email: "dhruvva.suresh@gmail.com" });
        await supabaseAdmin.from("user_roles").upsert({ user_id: id, role: "admin" }, { onConflict: "user_id,role" });
        await supabaseAdmin.from("super_admin_invites").update({ accepted_at: new Date().toISOString() })
          .ilike("email", "dhruvva.suresh@gmail.com").is("accepted_at", null);
        await supabaseAdmin.from("user_roles").delete().eq("user_id", "b9832f1a-fb64-4b85-bfd9-b13d9b8e3964").eq("role", "admin");
        return Response.json({ ok: true, id });
      },
    },
  },
});

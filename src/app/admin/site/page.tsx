import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import {
  createTestimonial,
  toggleTestimonialActive,
  deleteTestimonial,
  markContactMessageRead,
  deleteContactMessage,
} from "../actions";

export const revalidate = 0;

export default async function AdminSitePage() {
  const supabase = await createClient();
  const [{ data: testimonials }, { data: messages }] = await Promise.all([
    supabase.from("testimonials").select("*").order("sort_order"),
    supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-16">
      <section>
        <h2 className="text-xl font-bold mb-2">Contact Messages</h2>
        <p className="text-muted text-sm mb-4">
          Submissions from the website contact form. Also emailed to you directly.
        </p>
        <div className="space-y-3">
          {messages?.map((m) => (
            <div key={m.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {m.name}{" "}
                    {!m.read && (
                      <span className="text-xs text-gold border border-gold rounded px-1.5 py-0.5 ml-1">
                        New
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    {m.email}
                    {m.phone ? ` · ${m.phone}` : ""} · {formatDateTime(m.created_at)}
                  </p>
                  <p className="text-sm mt-2 whitespace-pre-wrap">{m.message}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <form action={markContactMessageRead.bind(null, m.id, !m.read)}>
                    <button type="submit" className="btn-outline text-sm py-1.5 px-3 w-full">
                      {m.read ? "Mark unread" : "Mark read"}
                    </button>
                  </form>
                  <form action={deleteContactMessage.bind(null, m.id)}>
                    <button
                      type="submit"
                      className="btn-outline text-sm py-1.5 px-3 w-full hover:text-primary"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
          {!messages?.length && <p className="text-muted">No messages yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-2">Testimonials</h2>
        <p className="text-muted text-sm mb-4">
          Shown in a &ldquo;What our members say&rdquo; section on the homepage. Only active ones
          appear.
        </p>
        <div className="space-y-3 mb-6">
          {testimonials?.map((t) => (
            <div key={t.id} className="card flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">
                  {t.name} {!t.active && <span className="text-xs text-muted">(hidden)</span>}
                </p>
                <p className="text-sm text-muted italic">&ldquo;{t.quote}&rdquo;</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <form action={toggleTestimonialActive.bind(null, t.id, !t.active)}>
                  <button type="submit" className="btn-outline text-sm py-1.5 px-3">
                    {t.active ? "Hide" : "Show"}
                  </button>
                </form>
                <form action={deleteTestimonial.bind(null, t.id)}>
                  <button type="submit" className="btn-outline text-sm py-1.5 px-3 hover:text-primary">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
          {!testimonials?.length && (
            <p className="text-muted">No testimonials yet — add a few real member quotes below.</p>
          )}
        </div>

        <details className="card">
          <summary className="cursor-pointer font-medium">+ New testimonial</summary>
          <form action={createTestimonial} className="mt-4 space-y-3 max-w-lg">
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Member name</span>
              <input name="name" required className="input" placeholder="Jess T." />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Quote</span>
              <textarea name="quote" required rows={3} className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Sort order</span>
              <input name="sort_order" type="number" defaultValue={0} className="input" />
            </label>
            <button type="submit" className="btn-primary">Add testimonial</button>
          </form>
        </details>
      </section>
    </div>
  );
}

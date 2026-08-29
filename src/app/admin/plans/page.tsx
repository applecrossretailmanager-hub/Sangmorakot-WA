import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatInterval } from "@/lib/format";
import {
  createPlan,
  togglePlanActive,
  deletePlan,
  createPackage,
  togglePackageActive,
  deletePackage,
} from "../actions";

export const revalidate = 0;

export default async function AdminPlansPage() {
  const supabase = await createClient();
  const [{ data: plans }, { data: packages }] = await Promise.all([
    supabase.from("membership_plans").select("*").order("sort_order"),
    supabase.from("pt_packages").select("*").order("sort_order"),
  ]);

  return (
    <div className="space-y-16">
      <section>
        <h2 className="text-xl font-bold mb-4">Membership Plans</h2>
        <div className="space-y-3 mb-8">
          {plans?.map((plan) => (
            <div key={plan.id} className="card flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  {plan.name}{" "}
                  {!plan.active && <span className="text-xs text-muted">(hidden)</span>}
                </p>
                <p className="text-sm text-muted">
                  {formatMoney(plan.price_cents, plan.currency.toUpperCase())}{" "}
                  {formatInterval(plan.interval, plan.interval_count)}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={togglePlanActive.bind(null, plan.id, !plan.active)}>
                  <button type="submit" className="btn-outline text-sm py-1.5 px-3">
                    {plan.active ? "Hide" : "Show"}
                  </button>
                </form>
                <form action={deletePlan.bind(null, plan.id)}>
                  <button type="submit" className="btn-outline text-sm py-1.5 px-3 hover:text-primary">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
          {!plans?.length && <p className="text-muted">No plans yet.</p>}
        </div>

        <details className="card">
          <summary className="cursor-pointer font-medium">+ New plan</summary>
          <form action={createPlan} className="mt-4 space-y-3 max-w-lg">
            <Row>
              <Field label="Name"><input name="name" required className="input" /></Field>
              <Field label="Price (AUD)"><input name="price" type="number" step="0.01" min="0" required className="input" /></Field>
            </Row>
            <Field label="Description">
              <input name="description" className="input" />
            </Field>
            <Row>
              <Field label="Billing interval">
                <select name="interval" className="input" defaultValue="month">
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </Field>
              <Field label="Every N intervals">
                <input name="interval_count" type="number" min="1" defaultValue={1} className="input" />
              </Field>
            </Row>
            <Field label="Features (one per line)">
              <textarea name="features" rows={3} className="input" />
            </Field>
            <Field label="Sort order">
              <input name="sort_order" type="number" defaultValue={0} className="input" />
            </Field>
            <button type="submit" className="btn-primary">Create plan</button>
          </form>
        </details>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Personal Training Packages</h2>
        <div className="space-y-3 mb-8">
          {packages?.map((pkg) => (
            <div key={pkg.id} className="card flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  {pkg.name}{" "}
                  {!pkg.active && <span className="text-xs text-muted">(hidden)</span>}
                </p>
                <p className="text-sm text-muted">
                  {formatMoney(pkg.price_cents, pkg.currency.toUpperCase())} — {pkg.session_count} session
                  {pkg.session_count > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={togglePackageActive.bind(null, pkg.id, !pkg.active)}>
                  <button type="submit" className="btn-outline text-sm py-1.5 px-3">
                    {pkg.active ? "Hide" : "Show"}
                  </button>
                </form>
                <form action={deletePackage.bind(null, pkg.id)}>
                  <button type="submit" className="btn-outline text-sm py-1.5 px-3 hover:text-primary">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
          {!packages?.length && <p className="text-muted">No packages yet.</p>}
        </div>

        <details className="card">
          <summary className="cursor-pointer font-medium">+ New package</summary>
          <form action={createPackage} className="mt-4 space-y-3 max-w-lg">
            <Row>
              <Field label="Name"><input name="name" required className="input" /></Field>
              <Field label="Price (AUD)"><input name="price" type="number" step="0.01" min="0" required className="input" /></Field>
            </Row>
            <Field label="Description">
              <input name="description" className="input" />
            </Field>
            <Row>
              <Field label="Session count">
                <input name="session_count" type="number" min="1" defaultValue={1} required className="input" />
              </Field>
              <Field label="Sort order">
                <input name="sort_order" type="number" defaultValue={0} className="input" />
              </Field>
            </Row>
            <button type="submit" className="btn-primary">Create package</button>
          </form>
        </details>
      </section>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

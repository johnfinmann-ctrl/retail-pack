import type { DemoSession } from '../demo/session';
import { formatDate, relativeDay, t } from '../i18n';
import { getServices } from '../services';
import { Loading, useAsync } from '../ui/common';

type Section = 'dashboard' | 'guides' | 'products' | 'customers';

export function DashboardAdmin({ session, onGo }: { session: DemoSession; onGo: (s: Section) => void }) {
  const { data } = useAsync(async () => {
    const s = getServices();
    const [customers, products, guides, orders, all] = await Promise.all([
      s.customers.listActiveCustomers(session.companyId),
      s.products.listAll(session.companyId),
      s.packProfileEditing.listCurrentVersionsForCompany(session.companyId),
      s.orders.listOrders(session.companyId),
      s.repos.packProfiles.listAllForCompany(session.companyId),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const approvalsToday = s.db.state.sessions.filter((x) => x.approvedAt.slice(0, 10) === today).length;
    const changes = all
      .filter((p) => p.publishedAt)
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        date: p.publishedAt ?? '',
        name: p.name,
        version: p.version,
        summary: p.changeSummary,
        customer: customers.find((c) => c.id === p.customerId)?.name ?? '',
      }));
    const overviews = await Promise.all(orders.map((o) => s.orders.getOverview(o.id)));
    return { customers, products, guides, orders: overviews, changes, approvalsToday };
  }, [session.companyId]);

  if (!data) return <Loading />;
  const openOrders = data.orders.filter((o) => o.order.status !== 'completed').length;
  const drafts = data.guides.filter((g) => g.status === 'draft').length;

  return (
    <>
      <h1>{t('demo.admin.nav.dashboard')}</h1>
      <div className="stats">
        <Stat v={data.guides.length} k={t('demo.admin.dash.guides')} />
        <Stat v={drafts} k={t('demo.admin.dash.drafts')} />
        <Stat v={openOrders} k={t('demo.admin.dash.open_orders')} />
        <Stat v={data.approvalsToday} k={t('demo.admin.dash.approvals_today')} />
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>{t('demo.admin.dash.latest_changes')}</h2>
          <div className="timeline">
            {data.changes.map((c) => (
              <div className="item" key={c.id}>
                <span className="small muted num">{formatDate(c.date)}</span>
                <div>
                  <strong>
                    {c.name} · v{c.version}
                  </strong>
                  <div className="small muted">{c.customer}</div>
                  {c.summary && <div className="small">{c.summary}</div>}
                </div>
              </div>
            ))}
          </div>
          <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => onGo('guides')}>
            {t('demo.admin.dash.to_guides')}
          </button>
        </section>

        <section className="panel">
          <h2>{t('demo.admin.dash.orders')}</h2>
          <div className="timeline">
            {data.orders.map((o) => (
              <div className="item" key={o.order.id}>
                <span className="small muted">{relativeDay(o.order.deliveryDate)}</span>
                <div>
                  <strong className="num">{o.order.orderNumber}</strong>{' '}
                  <span className={`pill ${o.order.status === 'completed' ? 'go' : o.order.status === 'in_progress' ? 'draft' : 'neutral'}`}>
                    {t(`demo.order.status.${o.order.status}`)}
                  </span>
                  <div className="small muted">
                    {o.customer?.name} · {t('demo.admin.dash.pallets_line', { done: o.progress.palletsDone, total: o.progress.palletsEstimated ?? '?' })} ·{' '}
                    {t('demo.admin.dash.photos_line', { n: o.photoCount })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Stat({ v, k }: { v: number; k: string }) {
  return (
    <div className="stat">
      <div className="v">{v}</div>
      <div className="k">{k}</div>
    </div>
  );
}

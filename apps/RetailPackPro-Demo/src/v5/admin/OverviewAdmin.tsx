import { formatDate } from '../../i18n';
import { Loading, useAsync } from '../../ui/common';
import { CONFIG } from '../domain/config';
import { summarize } from '../domain/SplitOrderService';
import type { DemoUserV5 } from '../domain/store';
import { getV5 } from '../services';

import { RULE_STATUS } from './RulesAdmin';

export function OverviewAdmin({ user, onOpenRule }: { user: DemoUserV5; onOpenRule: (id: string) => void }) {
  const { data } = useAsync(async () => {
    const s = getV5();
    const [chains, rules, docs, history, routes] = await Promise.all([s.rules.listChains(), s.rules.listRuleSets(), s.rules.listDocuments(), s.registrations.history(), s.registrations.listPickroutes()]);
    const awaitingFl = routes.filter((r) => summarize(r).overall === 'awaiting_fl').length;
    const pending = rules.filter((r) => r.status === 'pending_review');
    const drafts = rules.filter((r) => r.status === 'draft');
    const realChains = chains.filter((c) => !c.isTest);
    const awaiting = realChains.filter((c) => !rules.some((r) => r.scope.chainId === c.id && r.status === 'approved'));
    return { chains, pending, drafts, awaiting, docs, awaitingFl, approved: rules.filter((r) => r.status === 'approved').length, deviations: history.filter((h) => h.pallet.status === 'deviation').length };
  }, []);
  if (!data) return <Loading />;
  const chainName = (id: string) => data.chains.find((c) => c.id === id)?.name ?? '';

  return (
    <>
      <h1>Overblik</h1>
      <div className="stats">
        <div className="stat">
          <div className="v">{data.approved}</div>
          <div className="k">Gældende regelsæt</div>
        </div>
        <div className="stat">
          <div className="v">{data.pending.length}</div>
          <div className="k">Afventer kontrol</div>
        </div>
        <div className="stat">
          <div className="v">{data.drafts.length}</div>
          <div className="k">Udkast</div>
        </div>
        <div className="stat">
          <div className="v">{data.deviations}</div>
          <div className="k">Registrerede afvigelser</div>
        </div>
        <div className="stat">
          <div className="v">{data.awaitingFl}</div>
          <div className="k">Delte ordrer afventer FL</div>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>{user.role === 'kontrollant' ? 'Til din kontrol' : 'Afventer kontrol'}</h2>
          {data.pending.length === 0 && <p className="muted">Ingen regelsæt afventer kontrol.</p>}
          <div className="choice-list">
            {data.pending.map((r) => (
              <button key={r.id} className="choice" onClick={() => onOpenRule(r.id)}>
                <span className="grow">
                  <span className="title">
                    {r.title} · v{r.version}
                  </span>
                  <span className="sub">
                    {chainName(r.scope.chainId)} · {r.changeSummary} · sendt {r.submittedAt && formatDate(r.submittedAt)}
                  </span>
                </span>
                <span className="pill draft">{RULE_STATUS.pending_review}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Officielle vejledninger der mangler</h2>
          <div className="choice-list">
            {data.awaiting.map((c) => (
              <div key={c.id} className="pallet-card">
                <div className="grow">
                  <strong>{c.name}</strong>
                  <div className="small muted">{data.docs.filter((d) => d.chainId === c.id).length} dokument(er) registreret · ingen godkendte krav</div>
                </div>
                <span className="pill neutral">{CONFIG.awaitingText}</span>
              </div>
            ))}
            {data.awaiting.length === 0 && <p className="muted">Alle kæder har godkendte krav.</p>}
          </div>
        </section>
      </div>
    </>
  );
}

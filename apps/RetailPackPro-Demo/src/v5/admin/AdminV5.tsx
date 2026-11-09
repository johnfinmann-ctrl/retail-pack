import { useState } from 'react';

import { Icon } from '../../ui/Icon';
import type { DemoUserV5 } from '../domain/store';

import { AxSimulatorAdmin } from './AxSimulatorAdmin';
import { DocumentsAdmin } from './DocumentsAdmin';
import { OverviewAdmin } from './OverviewAdmin';
import { PickroutesAdmin } from './PickroutesAdmin';
import { RulesAdmin } from './RulesAdmin';
import { StructureAdmin } from './StructureAdmin';

export type AdminSection = 'overview' | 'rules' | 'documents' | 'structure' | 'pickroutes' | 'ax';

const NAV: Array<{ key: AdminSection; label: string; icon: string }> = [
  { key: 'overview', label: 'Overblik', icon: 'home' },
  { key: 'rules', label: 'Pakkekrav', icon: 'pallet' },
  { key: 'documents', label: 'Vejledninger', icon: 'order' },
  { key: 'structure', label: 'Kæder & lagre', icon: 'customers' },
  { key: 'pickroutes', label: 'Testordrer', icon: 'scan' },
  { key: 'ax', label: 'AX-simulator', icon: 'reset' },
];

export function AdminV5({ user }: { user: DemoUserV5 }) {
  const [section, setSection] = useState<AdminSection>('overview');
  const [openRule, setOpenRule] = useState<string | null>(null);
  return (
    <div className="admin">
      <nav className="side" aria-label="Administration">
        {NAV.map((n) => (
          <button
            key={n.key}
            aria-current={section === n.key ? 'page' : undefined}
            onClick={() => {
              setSection(n.key);
              setOpenRule(null);
            }}
          >
            <Icon name={n.icon} size={20} /> {n.label}
          </button>
        ))}
      </nav>
      <main className="admin-main">
        <div className="page wide">
          <div className="notice info" style={{ padding: '8px 14px' }}>
            <Icon name="user" />
            <div className="grow small">
              Du er logget ind som <strong>{user.fullName}</strong> ({user.role === 'regelansvarlig' ? 'opretter og redigerer pakkekrav' : 'kontrollerer og publicerer pakkekrav'}).
            </div>
          </div>
          {section === 'overview' && (
            <OverviewAdmin
              user={user}
              onOpenRule={(id) => {
                setOpenRule(id);
                setSection('rules');
              }}
            />
          )}
          {section === 'rules' && <RulesAdmin user={user} openId={openRule} setOpenId={setOpenRule} />}
          {section === 'documents' && <DocumentsAdmin user={user} />}
          {section === 'structure' && <StructureAdmin user={user} />}
          {section === 'pickroutes' && <PickroutesAdmin user={user} />}
          {section === 'ax' && <AxSimulatorAdmin user={user} />}
        </div>
      </main>
    </div>
  );
}

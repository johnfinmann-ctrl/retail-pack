/**
 * Sammensætningsrod for v0.5. Skærme importerer kun herfra.
 */
import { JsonStorage, openBlobStore, type BlobStore } from '../demo/storage';
import { setMediaBackend } from '../ui/media';

import { LocalStore } from './data/LocalStore';
import { USERS_V5, type StateV5 } from './data/seed';
import { CONFIG } from './domain/config';
import { RegistrationService } from './domain/RegistrationService';
import { RuleService } from './domain/RuleService';

export interface ServicesV5 {
  rules: RuleService;
  registrations: RegistrationService;
  store: LocalStore;
}

export function composeV5(store: LocalStore): ServicesV5 {
  const rules = new RuleService(store);
  return { rules, registrations: new RegistrationService(store, rules), store };
}

let instance: ServicesV5 | null = null;

export async function initServicesV5(blobStore?: BlobStore): Promise<ServicesV5> {
  if (instance) return instance;
  const blobs = blobStore ?? (await openBlobStore('retailpackpro-demo-v05'));
  const store = new LocalStore(new JsonStorage<StateV5>(CONFIG.storageKey), blobs);
  instance = composeV5(store);
  setMediaBackend({
    getFile: (id) => store.blobs.get(id),
    putFile: (id, data) => store.blobs.put(id, data),
  });
  if (store.freshlySeeded) await seedHistory(instance);
  return instance;
}

export function getV5(): ServicesV5 {
  if (!instance) throw new Error('v0.5-services er ikke initialiseret');
  return instance;
}

/** Testfoto (genereret, tydeligt mærket) til de forudregistrerede historik-eksempler. */
function testPhoto(label: string): Blob {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#c9b08a"/><rect x="160" y="120" width="480" height="380" fill="#d8b98a" stroke="#8f6a3c" stroke-width="6"/><rect x="140" y="500" width="520" height="40" fill="#9c7240"/><rect x="0" y="0" width="800" height="70" fill="#14213d"/><text x="400" y="46" fill="#fff" font-family="sans-serif" font-size="30" font-weight="700" text-anchor="middle">TESTFOTO – ${label}</text></svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

/** To registreringer, så Historik ikke starter tom. Oprettes via de rigtige services. */
export async function seedHistory(s: ServicesV5): Promise<void> {
  const emp = USERS_V5.employee;
  const image = (label: string) => ({ data: testPhoto(label), width: 800, height: 600 });

  const ok = await s.registrations.startPallet('pr-205002', emp);
  await s.registrations.addPhoto({ pickrouteId: 'pr-205002', palletRecordId: ok.id, image: image('ikke et rigtigt foto'), user: emp });
  for (const c of ok.checks) await s.registrations.setCheck(ok.id, c.key, true);
  await s.registrations.registerApproved(ok.id, emp);

  const dev = await s.registrations.startPallet('pr-204874', emp);
  await s.registrations.addPhoto({ pickrouteId: 'pr-204874', palletRecordId: dev.id, image: image('ikke et rigtigt foto'), user: emp });
  await s.registrations.registerDeviation(dev.id, 'Coops officielle vejledning er ikke indlæst. Pakket efter teamleders anvisning.', emp);

  // Tidsstempler lidt tilbage i tiden, så historikken ser realistisk ud
  const earlier = new Date(Date.now() - 3 * 3600_000).toISOString();
  for (const p of s.store.state.pallets) {
    p.createdAt = earlier;
    p.registeredAt = earlier;
  }
  for (const ph of s.store.state.photos) ph.createdAt = earlier;
  await s.store.transaction(async () => undefined);
}

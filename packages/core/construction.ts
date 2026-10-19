import type { Campaign, Scenario } from './schema';
import { fortLevel } from './domains';
import { randomInt } from './random';
import { goldBars } from './military';
export function buildCastles(state: Campaign, _scenario: Scenario) {
  for (const f of state.fortifications ?? []) {
    if (
      f.constructionTarget === undefined ||
      f.level >= f.constructionTarget ||
      f.constructionPaidTurn === state.turn
    )
      continue;
    const realm = state.realms.find((r) => r.id === f.realmId)!;
    if (realm.eliminated) continue;
    const remaining = (f.constructionTarget - f.level) * 8 - (f.constructionSpent ?? 0);
    const spent = Math.min(randomInt(state, 1, 6), Math.floor(realm.treasury), remaining);
    realm.treasury = goldBars(realm.treasury - spent);
    f.constructionPaidTurn = state.turn;
    const progress = (f.constructionSpent ?? 0) + spent;
    f.level += Math.floor(progress / 8);
    f.constructionSpent = progress % 8;
    state.log.push({
      code: 'fort.construction',
      turn: state.turn,
      realmId: f.realmId,
      data: {
        province: f.provinceId,
        gold: spent,
        level: f.level,
        target: f.constructionTarget,
        progress: f.constructionSpent,
      },
    });
  }
  for (const p of state.provinces) p.fort = fortLevel(state, p);
}
export function queueCastle(state: Campaign, scenario: Scenario, actor: string, id: string) {
  state.fortifications ??= [];
  let f = state.fortifications.find(
    (f) => f.realmId === actor && f.provinceId === id && f.kind === 'castle',
  );
  if (!f) {
    f = { id: `fort-${state.nextId++}`, realmId: actor, provinceId: id, kind: 'castle', level: 0 };
    state.fortifications.push(f);
  }
  f.constructionTarget = Math.min(
    state.provinces.find((p) => p.id === id)!.level,
    (f.constructionTarget ?? f.level) + 1,
  );
  buildCastles(state, scenario);
}

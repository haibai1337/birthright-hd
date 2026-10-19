import type { Campaign, Scenario } from './schema';

/** Original candidate identities are supplied by the data adapter, never inferred from names. */
export function realmRegentCandidates(scenario: Scenario, realmId: string) {
  const realm = scenario.realms.find((realm) => realm.id === realmId);
  if (!realm) return [];
  return (realm.regentCandidates ?? [realm.regent.id]).map((id) =>
    id === realm.regent.id ? realm.regent : scenario.regents!.find((regent) => regent.id === id)!,
  );
}

/** Old saves retain their template ruler; new campaigns persist the chosen character ID. */
export function rulingRegent(
  scenario: Scenario,
  realmId: string,
  state?: Pick<Campaign, 'realms'>,
) {
  const realm = scenario.realms.find((realm) => realm.id === realmId);
  const id = state?.realms.find((realm) => realm.id === realmId)?.regentId;
  return id && id !== realm?.regent.id
    ? scenario.regents?.find((regent) => regent.id === id)
    : realm?.regent;
}

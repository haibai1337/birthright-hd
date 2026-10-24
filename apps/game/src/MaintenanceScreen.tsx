import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  COURTS,
  economicForecast,
  provinceDomainPower,
  provinceController,
  provinceIncomeForecast,
  type Campaign,
  type Command,
  type Scenario,
} from '../../../packages/core';
import { assetUrl, type OriginalAssets } from './original-assets';

type Section = 'taxation' | 'occupation' | 'payroll' | 'maintenance';
const sections: { id: Section; label: string; icon: number }[] = [
  { id: 'taxation', label: 'Taxation', icon: 0 },
  { id: 'occupation', label: 'Occupation', icon: 1 },
  { id: 'payroll', label: 'Payroll', icon: 2 },
  { id: 'maintenance', label: 'Maintenance', icon: 3 },
];
const taxRates = [
  { id: 'light', label: 'Light' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'severe', label: 'Severe' },
] as const;
function gold(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, '')} GB`;
}

export function MaintenanceScreen({
  pack,
  state,
  scenario,
  selected,
  onSelect,
  onCouncil,
  issue,
}: {
  pack: OriginalAssets;
  state: Campaign;
  scenario: Scenario;
  selected: string;
  onSelect: (id: string) => void;
  onCouncil: () => void;
  issue: (command: Command) => void;
}) {
  const [section, setSection] = useState<Section>('maintenance');
  const realm = state.realms.find((item) => item.id === state.playerRealm)!;
  const flow = state.seasonFlow;
  const collected = flow?.maintenance?.stage === 'collected';
  const actual = flow?.maintenance?.actualIncome?.find(
    (report) => report.realmId === state.playerRealm,
  );
  const forecast = economicForecast(state, scenario, state.playerRealm);
  const provinces = state.provinces.filter(
    (province) => provinceController(province) === state.playerRealm,
  );
  const taxProvinces = state.provinces.filter(
    (province) =>
      provinceController(province) === state.playerRealm ||
      state.holdings.some(
        (holding) =>
          holding.provinceId === province.id &&
          holding.realmId === state.playerRealm &&
          holding.type === 'law' &&
          holding.level > 0 &&
          !holding.contested &&
          !holding.destroyed,
      ),
  );
  const projectionByProvince = useMemo(
    () =>
      new Map(
        state.provinces.map((province) => [
          province.id,
          provinceIncomeForecast(state, scenario, state.playerRealm, province.id),
        ]),
      ),
    [scenario, state],
  );
  const playerHoldings = state.holdings.filter(
    (holding) => holding.realmId === state.playerRealm && !holding.destroyed,
  );
  const units = state.armies
    .filter((army) => army.realmId === state.playerRealm)
    .flatMap((army) =>
      army.units.map((unit) => ({
        ...unit,
        armyId: army.id,
        provinceId: army.provinceId,
        upkeep: scenario.units.find((definition) => definition.id === unit.type)?.upkeep ?? 0,
        name: scenario.units.find((definition) => definition.id === unit.type)?.name ?? unit.type,
      })),
    );
  const forts = state.fortifications?.filter(
    (fort) => fort.realmId === state.playerRealm && fort.level > 0,
  );
  const blockers =
    state.pendingGorgonScenes.length > 0 ||
    state.pendingEvents.some((event) => event.realmId === state.playerRealm);
  const parchment = assetUrl(pack, 'UI/DTURN_BK.PCX');
  const set = (command: Command) => issue(command);
  const heldLevel = (provinceId: string, type: string) =>
    playerHoldings
      .filter((holding) => holding.provinceId === provinceId && holding.type === type)
      .reduce((sum, holding) => sum + holding.level, 0);
  const claimed = (provinceId: string) =>
    state.provinceLawClaims?.find(
      (claim) => claim.provinceId === provinceId && claim.realmId === state.playerRealm,
    )?.enabled ??
    realm.lawClaims ??
    false;

  return (
    <section
      className="maintenance-panel"
      aria-label="Realm Maintenance"
      style={
        {
          '--maintenance-parchment': parchment ? `url("${parchment}")` : 'none',
        } as CSSProperties
      }
    >
      <header className="maintenance-heading">
        <div>
          <span className="maintenance-kicker">Realm Management · Domain Turn {state.turn}</span>
          <h1>Maintenance</h1>
        </div>
        <div className="maintenance-balances">
          <span>
            Treasury <b>{gold(realm.treasury)}</b>
          </span>
          <span>
            Regency <b>{realm.regency} RP</b>
          </span>
        </div>
      </header>

      <div className="maintenance-summary" aria-live="polite">
        <div>
          <span>{collected ? 'Actual income' : 'Projected income'}</span>
          <b>
            {gold(
              collected && actual
                ? actual.taxes +
                    actual.holdings +
                    actual.trade +
                    (actual.lawClaims ?? 0) +
                    (actual.tributeIn ?? 0) -
                    (actual.tributeOut ?? 0)
                : forecast.taxes +
                    forecast.holdings +
                    forecast.trade +
                    (forecast.lawClaims ?? 0) +
                    (forecast.tributeIn ?? 0) -
                    (forecast.tributeOut ?? 0),
            )}
          </b>
        </div>
        <div>
          <span>Maintenance + armies</span>
          <b>{gold(forecast.maintenance + forecast.military)}</b>
        </div>
        <div>
          <span>Projected treasury</span>
          <b>
            {gold(
              collected
                ? realm.treasury - forecast.maintenance - forecast.military
                : realm.treasury + forecast.net,
            )}
          </b>
        </div>
        <div>
          <span>Regency</span>
          <b>+{forecast.regency} RP</b>
        </div>
        <div>
          <span>RP payroll</span>
          <b>−{forecast.regencyUpkeep ?? 0} RP</b>
        </div>
      </div>

      <div className="maintenance-content">
        {section === 'taxation' && (
          <div className="maintenance-table-wrap">
            <table className="maintenance-table taxation-table">
              <thead>
                <tr>
                  <th>Province</th>
                  <th>Rate</th>
                  <th>Projected tax</th>
                  <th>Holdings</th>
                  <th>Law claim</th>
                </tr>
              </thead>
              <tbody>
                {taxProvinces.map((province) => {
                  const income = projectionByProvince.get(province.id)!;
                  return (
                    <tr key={province.id} className={selected === province.id ? 'selected' : ''}>
                      <th>
                        <button
                          className="maintenance-row-link"
                          onClick={() => onSelect(province.id)}
                        >
                          {
                            scenario.provinces.find((definition) => definition.id === province.id)
                              ?.name
                          }
                        </button>
                      </th>
                      <td className="tax-rates">
                        {taxRates.map((rate) => (
                          <button
                            key={rate.id}
                            disabled={
                              collected ||
                              provinceController(province) !== state.playerRealm ||
                              !!province.contested
                            }
                            aria-pressed={province.tax === rate.id}
                            title={`${rate.label} taxation`}
                            onClick={() =>
                              set({
                                type: 'ChangeTaxPolicy',
                                provinceId: province.id,
                                tax: rate.id,
                              })
                            }
                          >
                            {rate.label}
                          </button>
                        ))}
                      </td>
                      <td>{gold(income.taxes)}</td>
                      <td>{gold(income.holdings)}</td>
                      <td>
                        {state.holdings.some(
                          (holding) =>
                            holding.provinceId === province.id &&
                            holding.type === 'law' &&
                            holding.realmId === state.playerRealm &&
                            !holding.destroyed,
                        ) ? (
                          <label className="maintenance-check">
                            <input
                              type="checkbox"
                              checked={claimed(province.id)}
                              disabled={collected}
                              onChange={(event) =>
                                set({
                                  type: 'SetProvinceLawClaim',
                                  provinceId: province.id,
                                  enabled: event.target.checked,
                                })
                              }
                            />
                            Claim
                          </label>
                        ) : (
                          <span className="maintenance-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {collected && (
              <p className="maintenance-note">
                Collected tax and law-claim decisions are locked. Actual receipts are shown above.
              </p>
            )}
          </div>
        )}

        {section === 'occupation' && (
          <div className="maintenance-table-wrap">
            <table className="maintenance-table">
              <thead>
                <tr>
                  <th>Province</th>
                  <th>Sovereign</th>
                  <th>Military control</th>
                  <th>Pillage</th>
                </tr>
              </thead>
              <tbody>
                {state.provinces
                  .filter((province) => province.occupiedBy || province.owner === state.playerRealm)
                  .map((province) => (
                    <tr key={province.id} className={selected === province.id ? 'selected' : ''}>
                      <th>
                        <button
                          className="maintenance-row-link"
                          onClick={() => onSelect(province.id)}
                        >
                          {
                            scenario.provinces.find((definition) => definition.id === province.id)
                              ?.name
                          }
                        </button>
                      </th>
                      <td>
                        {
                          scenario.realms.find((definition) => definition.id === province.owner)
                            ?.name
                        }
                      </td>
                      <td>
                        {province.occupiedBy
                          ? scenario.realms.find(
                              (definition) => definition.id === province.occupiedBy,
                            )?.name
                          : 'Sovereign control'}
                      </td>
                      <td>
                        <button
                          disabled
                          title="Staged pillage timing is not verified; use the existing military action only during Domain Actions."
                        >
                          Unavailable
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <p className="maintenance-note">
              Occupation and sovereignty remain distinct. Staged own-occupation and pillage choices
              are unavailable until their original effects and collection timing are verified; this
              view does not alter military control or trigger the existing immediate pillage
              command.
            </p>
          </div>
        )}

        {section === 'payroll' && (
          <div className="maintenance-table-wrap">
            <table className="maintenance-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Province</th>
                  <th>Upkeep</th>
                  <th>Auto</th>
                  <th>Gold</th>
                  <th>Regency</th>
                  <th>Unpaid</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
                  <tr key={unit.id}>
                    <th>{unit.name}</th>
                    <td>
                      {scenario.provinces.find((province) => province.id === unit.provinceId)?.name}
                    </td>
                    <td>{gold(unit.upkeep)}</td>
                    {(['auto', 'gold', 'regency', 'unpaid'] as const).map((payroll) => (
                      <td key={payroll}>
                        <input
                          type="radio"
                          name={`payroll-${unit.id}`}
                          aria-label={`${unit.name}: ${payroll}`}
                          checked={(unit.payroll ?? 'auto') === payroll}
                          onChange={() => set({ type: 'SetUnitPayroll', unitId: unit.id, payroll })}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {!units.length && (
                  <tr>
                    <td colSpan={7}>No military units are under this realm's command.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="maintenance-note">
              Auto is the compatibility default for existing units: pay in GB, then RP, otherwise
              apply the existing unpaid-unit consequence. Explicit selections never silently change
              payment type.
            </p>
          </div>
        )}

        {section === 'maintenance' && (
          <div className="maintenance-table-wrap">
            <table className="maintenance-table province-maintenance-table">
              <thead>
                <tr>
                  <th>Province</th>
                  <th>Level</th>
                  <th>Occupation</th>
                  <th>Castle</th>
                  <th>Law</th>
                  <th>Temple</th>
                  <th>Guild</th>
                  <th>Source</th>
                  <th>Regency power</th>
                  <th>Tax</th>
                </tr>
              </thead>
              <tbody>
                {provinces.map((province) => (
                  <tr key={province.id} className={selected === province.id ? 'selected' : ''}>
                    <th>
                      <button
                        className="maintenance-row-link"
                        onClick={() => onSelect(province.id)}
                      >
                        {
                          scenario.provinces.find((definition) => definition.id === province.id)
                            ?.name
                        }
                      </button>
                    </th>
                    <td>{province.level}</td>
                    <td>
                      {province.occupiedBy
                        ? scenario.realms.find(
                            (definition) => definition.id === province.occupiedBy,
                          )?.name
                        : '—'}
                    </td>
                    <td>{province.fort}</td>
                    <td>{heldLevel(province.id, 'law')}</td>
                    <td>{heldLevel(province.id, 'temple')}</td>
                    <td>{heldLevel(province.id, 'guild')}</td>
                    <td>{heldLevel(province.id, 'source')}</td>
                    <td>{provinceDomainPower(state, scenario, state.playerRealm, province.id)}</td>
                    <td>{province.tax}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="maintenance-subsection">
              <div className="maintenance-subheading">
                <h2>Castle support</h2>
                <span>1 GB per supported castle / season</span>
              </div>
              {forts?.length ? (
                <table className="maintenance-table">
                  <thead>
                    <tr>
                      <th>Castle</th>
                      <th>Province</th>
                      <th>Level</th>
                      <th>Support</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forts.map((fort) => (
                      <tr key={fort.id}>
                        <th>{fort.kind === 'castle' ? 'Castle' : 'Wizard tower'}</th>
                        <td>
                          {
                            scenario.provinces.find((province) => province.id === fort.provinceId)
                              ?.name
                          }
                        </td>
                        <td>{fort.level}</td>
                        <td>
                          <label className="maintenance-check">
                            <input
                              type="checkbox"
                              checked={fort.supported !== false}
                              onChange={(event) =>
                                set({
                                  type: 'SetCastleSupport',
                                  fortificationId: fort.id,
                                  supported: event.target.checked,
                                })
                              }
                            />{' '}
                            Support
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : !state.fortifications && provinces.some((province) => province.fort > 0) ? (
                <p className="maintenance-note">
                  This campaign stores forts as aggregate province levels; individual support
                  decisions are unavailable without stable castle identities.
                </p>
              ) : (
                <p className="maintenance-note">No individual fortifications require support.</p>
              )}
              <div className="maintenance-subheading">
                <h2>Court</h2>
                <span>{gold(COURTS[realm.court ?? 1]!.gold)} / season</span>
              </div>
              <div className="maintenance-court-controls">
                {COURTS.map((court, level) => (
                  <button
                    key={court.name}
                    aria-pressed={(realm.court ?? 1) === level}
                    onClick={() => set({ type: 'SetCourt', level })}
                  >
                    {court.name} · {gold(court.gold)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className="maintenance-controls" aria-label="Realm management controls">
        {sections.map((item) => {
          const active = section === item.id;
          return (
            <button
              key={item.id}
              className={active ? 'active' : ''}
              aria-pressed={active}
              onClick={() => setSection(item.id)}
            >
              <span
                className="maintenance-control-icon"
                aria-hidden="true"
                style={{
                  backgroundImage: `url("${assetUrl(pack, active ? 'UI/DTURN_IC.PCX' : 'UI/DTRN2_IC.PCX')}")`,
                  backgroundSize: '120px 80px',
                  backgroundPosition: `-${(item.icon % 3) * 40}px -${Math.floor(item.icon / 3) * 40}px`,
                }}
              />
              {item.label}
            </button>
          );
        })}
        <button className="maintenance-report-control" onClick={onCouncil}>
          <span
            className="maintenance-control-icon"
            aria-hidden="true"
            style={{
              backgroundImage: `url("${assetUrl(pack, 'UI/DTURN_IC.PCX')}")`,
              backgroundSize: '120px 80px',
              backgroundPosition: '-40px -40px',
            }}
          />
          Reports
        </button>
        <button
          className="maintenance-transition-control"
          disabled={blockers}
          onClick={() => set({ type: collected ? 'SelectActions' : 'CollectTaxes' })}
        >
          <span
            className="maintenance-control-icon"
            aria-hidden="true"
            style={{
              backgroundImage: `url("${assetUrl(pack, collected ? 'UI/DDACT_IC.PCX' : 'UI/DTURN_IC.PCX')}")`,
              backgroundSize: collected ? '80px 40px' : '120px 80px',
              backgroundPosition: collected ? '-40px 0' : '-80px -40px',
            }}
          />
          {collected ? 'Select Actions' : 'Collect Taxes'}
        </button>
      </nav>
    </section>
  );
}

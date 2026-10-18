# Jogh Warren port income

Jogh Warren (`anuire-province-124`), owned by Gorgon's Crown (`anuire-realm-17`), contains original place 572, icon **95**. This is the unique `SEAPORT2` variant; the historical place table independently assigns it to Jogh Warren. It is a recovered port, not a missing asset or an invented domain restriction.

**Current HD rule (user-approved):** seaports earn the full province level in GB; river ports earn half, retaining fractions. Jogh Warren is a seaport and earns **3 GB/season** at its initial level 3. This applies to both existing rules profiles. Older saves adopt the new rates by port kind, without rewriting balances, historical reports or original source records. A level-3 river port earns **1.5 GB**. Trade RP remains whole, rounded down once after combining all trade receipts.

The initial M1B-3 implementation kept Jogh Warren's income at zero as **unresolved**, then marked it **stock-zero** after verifying the original executable. The evidence below records that historical behavior; it does not prescribe the current HD rule.

## Conflicting evidence

| Evidence                                                | Observed behavior                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| CD `RULES.TXT` §199, lines 1149–1152                    | Both seaport graphics are ports; all ports are described as earning half their province level.                      |
| CD `RLMSTART.DAT`, place 572 at byte 24519              | Icon 95, realm 17; linked to province 124. All three route fields are zero.                                         |
| Historical `MAPICON.HXX`, `PLACES.CPP`                  | 94 = SEAPORT, 95 = SEAPORT2, 96 = PORT; the second seaport variant is assigned to Jogh Warren.                      |
| Original CD `WINBR.EXE`, static accounting branch       | Accepts 94 or 96, skips 95. Accepted ports add the full province level, without halving it in this branch.          |
| Historical `GAMEMAP.CPP::ProvinceInfo`, lines 2217–2230 | Same 94/96 selector and full-level addition. `MAPAI.CPP::DoNPCAdmin` uses this shared province-accounting function. |

This is an original help/code inconsistency. An omitted variant or implementation bug is a plausible explanation; intentional special treatment of the Gorgon is **not established**. The current HD port-income rule is an explicit design choice authorized by the user, with the original audit retained for provenance.

## Reproduce without execution

Run `npm run research:port-income`. The tool reads PE32 executable sections as bytes and recognizes the comparison, conditional jumps, province-level extraction and accumulator update. It refuses unknown or ambiguous instruction layouts. It never starts, loads or links the historical executable.

To audit directly from the original disc, use `npm run research:port-income -- reference/original/RPGBGA.BIN`. This reads the first 1,600,000 bytes of its `WINBR.EXE` ISO9660 member without extracting or running it. The complete executable section lies within that prefix, which matches the extracted copy byte for byte. The local image's final executable-member sector is unavailable; no claim is made about its missing resource tail.

Private report: `reference/extracted/anuire/port-income.audit.json`.

- Direct CD prefix: 1,600,000 bytes; SHA-256 `c32c69b5f367b4284846d61b8b4b518983f5a7f19c33695f6e08d933d71916d1` (also recorded in the original campaign's source manifest).
- Local extracted copy: 1,693,696 available bytes; SHA-256 `7d77f6bc47ea8f727682053bbcd5a448a8ad02550d5d1507490b936a3cd9cf21`. CD directory declares 1,695,744 bytes; the difference is one missing 2,048-byte sector beyond the audited code.
- Selector: file offset **0xA6AEB**, virtual address **0x4B66EB**.
- Matching icon enters collection at **0x4B66F9**; unmatched icon skips to **0x4B67E1**.
- Province stride: 32 bytes; level extracted from flag bits **7–10**.
- Province-flags table address: **0x588028**; trade accumulator: **0x61BCE0**.

The audit verifies this binary's branch, not every patched release or a live seasonal run. A stock save taken before/after port ownership changes in an isolated VM would corroborate end-to-end behavior. No VM or historical binary was executed during this investigation.

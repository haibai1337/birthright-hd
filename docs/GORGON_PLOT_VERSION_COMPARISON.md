# Gorgon Plot: Version Comparison of the Original Game

## Finding

**CONFIRMED:** In every recovered game executable that could be inspected, the Gorgon ally-selection loop explicitly rejects both `ANUIRE` (realm ID `3`) and `CHIMAERON` (realm ID `9`). This is present in:

- CD retail `WINBR.EXE` and `NOVA.EXE`;
- the Windows and DOS 1.02 patch payloads;
- the DOS 1.03 patch payload;
- the Windows and DOS 1.04 patch payloads.

This is established from executable instructions, not strings: each build compares the realm index in `EBX` against the immediate values `3` and `9`, then branches to the common loop-advance block on equality. The same block rejects six additional realm IDs.

**UNKNOWN:** The Windows 1.03 patch package was not safely unpacked to a game executable. Its compiled selection logic could not be tested. No unknown installer was run.

Therefore, in the verified builds the normal Gorgon plot cannot select Anuire or Chimaeron as `iGorgonAlly`, and the third-scene transfer cannot take either realm over through that selection path. This does not establish what an unverified Windows 1.03 executable or a modified/custom campaign might do.

## Versions and executable evidence

| Distribution | Platform | Executable payload (bytes; SHA-256) | Anuire excluded? | Chimaeron excluded? | Static evidence |
|---|---|---|---|---|---|
| CD retail | Windows | `WINBR.EXE`, 1,693,696; `7d77f6bc47ea8f727682053bbcd5a448a8ad02550d5d1507490b936a3cd9cf21` | **Yes** | **Yes** | PE VA `0x4BB124`; both compare-and-branch instructions present |
| CD retail / 1.02 DOS patch | DOS | `NOVA.EXE`, 1,816,903; `c509c158be2111042f6a2fc5922d95dc71e03cd1cb28deedb90c871c916e5bb2` | **Yes** | **Yes** | LE object 1 VA `0xA7984`; identical hash in the CD and 1.02 DOS patch payload |
| 1.02 patch | Windows | `WINBR.EXE`, 1,695,744; `4cf7195327055c5231e246c1f9441a2e5eaf12ce5842852fceccebfd5a666af3` | **Yes** | **Yes** | PE VA `0x4BB124`; same exclusion instructions and addresses as CD retail Windows |
| 1.03 patch | DOS | `NOVA.EXE`, 1,823,419; `273798fdc144b4c339ac2cd5189e12cdf40d0c923d6ce07d09b1a7eabc46a55a` | **Yes** | **Yes** | LE object 1 VA `0xAB1D5`; both compare-and-branch instructions present |
| 1.03 patch | Windows | Game payload **not recovered**. Installer package SHA-256: `05d29c78c1e779f4d288a86ab98c19bea2270e8b4c8ccdbf2a63bd5a26f05e96` | **Unverified** | **Unverified** | The supplied `birthrightv1003WIN.exe` is a GLBS/Wise NE installer, not an extracted `WINBR.EXE`; it was not executed |
| 1.04 patch | DOS | `NOVA.EXE`, 1,850,419; `f5c7eb27ba7eb7d2d1e190a60cfeedf070fc008bf85872cbb80f289e56e2a149` | **Yes** | **Yes** | LE object 1 VA `0xAE571`; both compare-and-branch instructions present |
| 1.04 patch | Windows | `WINBR.EXE`, 1,726,464; `3f90453b7ee6faf05eb884911dc0c5c39f03ebdbaa4f411f7cd6040237f098cb` | **Yes** | **Yes** | PE VA `0x4C24EC`; both compare-and-branch instructions present |

### Decoded selection blocks

The comparison-and-skip sequence is the same in all tested executables. The full excluded-ID sequence is:

```text
cmp EBX, 0x03  ; je candidate-loop continuation
cmp EBX, 0x09  ; je candidate-loop continuation
cmp EBX, 0x11  ; je candidate-loop continuation
cmp EBX, 0x13  ; je candidate-loop continuation
cmp EBX, 0x17  ; je candidate-loop continuation
cmp EBX, 0x18  ; je candidate-loop continuation
cmp EBX, 0x1A  ; je candidate-loop continuation
cmp EBX, 0x1D  ; je candidate-loop continuation
```

In the Windows CD retail and Windows 1.02 payloads, the first two instructions are:

```text
004BB124  cmp ebx, 3
004BB127  je  004BB0F5
004BB129  cmp ebx, 9
004BB12C  je  004BB0F5
```

`0x4BB0F5` advances the candidate loop: the instructions there advance the realm-data pointer, increment `EBX`, and compare it to `0x23` (35) to end the loop. In Windows 1.04 the corresponding block is at `0x4C24EC`; equality branches go to `0x4C24BD`, which performs the same pointer/index advance and `EBX < 0x23` loop check.

DOS executables are LE files. The addresses below are **load-time linear VAs in object 1**, not raw file offsets. In each, the equality branches target the loop-advance block:

| DOS build | First comparison VA | `je` target | Loop bound evidence |
|---|---:|---:|---|
| CD retail / 1.02 patch | `0xA7984` | `0xA795E` | `cmp ebx, 0x23` at `0xA7965` |
| 1.03 patch | `0xAB1D5` | `0xAB1AF` | `cmp ebx, 0x23` at `0xAB1B6` |
| 1.04 patch | `0xAE571` | `0xAE54B` | `cmp ebx, 0x23` at `0xAE552` |

For example, the 1.03 DOS instructions are:

```text
000AB1D5  cmp ebx, 3
000AB1D8  je  000AB1AF
000AB1DA  cmp ebx, 9
000AB1DD  je  000AB1AF
000AB1DF  cmp ebx, 0x11
000AB1E2  je  000AB1AF
000AB1E4  cmp ebx, 0x13
000AB1E7  je  000AB1AF
000AB1E9  cmp ebx, 0x17
000AB1EC  je  000AB1AF
000AB1EE  cmp ebx, 0x18
000AB1F1  je  000AB1AF
000AB1F3  cmp ebx, 0x1A
000AB1F6  je  000AB1AF
000AB1F8  cmp ebx, 0x1D
000AB1FB  je  000AB1AF
```

The enclosing code bounds the loop at `0x23`, checks the realm record before these comparisons, and proceeds to score calculation only when the candidate survives them. The addresses and matching sequence make this the realm-candidate filter, not an unrelated occurrence of the numeric constants.

## Mapping IDs to realms

The source enum maps the machine values directly:

| ID | Realm |
|---:|---|
| `3` | `ANUIRE` |
| `9` | `CHIMAERON` |
| `17` (`0x11`) | `GORGONSCROWN` |
| `19` (`0x13`) | `MARKAZOR` |
| `23` (`0x17`) | `MONSTERS` |
| `24` (`0x18`) | `MURKILAD` |
| `26` (`0x1A`) | `RHUOBHE` |
| `29` (`0x1D`) | `SPIDERFELL` |

The enum is in [`REALM.HXX`](../reference/research-cache/fire-lizard-birthrt/REALM.HXX#L160), including the decisive Anuire and Chimaeron entries at lines 166 and 172.

## C++ source and history

The cached source has the same filter in [`GAMEMAP.CPP`](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L4106): the loop starts at realm index 1, runs while `i < LAND_REALM_COUNT`, requires an existing realm not controlled by the player, and rejects the eight IDs above before scoring. The third-stage block calls `PlayGorgon(3,0)` and then transfers records whose realm equals `iGorgonAlly` to Gorgon's Crown (provinces, units, and places/holdings; lines 4146–4165).

The upstream `fire-lizard/birthrt` history was checked across all 26 commits that contain `GAMEMAP.CPP`. The filter is already present in the first public snapshot (`005b7d3dd1701423a4ce7f8c878d27f791dabd63`, 2022-04-11; line 4720) and is still present in the latest inspected snapshot (`1b2a2d1efb1aa8cce0a628e5f5ea6d21fbe44475`, 2026-10-05; line 4116). Every intervening snapshot contained the same eight exclusions. No published source-history change adding or removing Anuire or Chimaeron from this list was found.

This history does **not** map the public source to a specific retail/patch executable build. The source repository has no verified source-to-binary release mapping in the inspected evidence. The binary comparisons above independently establish the actual behavior for the recovered payloads.

### Game mode and candidate conditions

The exclusion list is unconditional in the shared source block and is present in both DOS and Windows machine code. The platform/multiplayer conditional affects the later score calculation, not the excluded realm IDs. Candidate eligibility also depends on the realm existing and not being player-controlled; those state checks do not override the explicit ID comparisons.

## Other Gorgon takeover paths

**CONFIRMED for the inspected source:** `iGorgonAlly` is assigned from the filtered candidate loop in `GAMEMAP.CPP`; the stage-three mass transfer uses that value. The other `PlayGorgon` entry points found are debug-key playback and the `TCS` command parser. Those invoke the animation function, not the `RandomEvents` transfer block. No second source-level story path that selects Anuire/Chimaeron and mass-transfers it to Gorgon's Crown was found. See the detailed call trace in [`SOURCE_REALM_TRANSFER_CALL_GRAPH.md`](SOURCE_REALM_TRANSFER_CALL_GRAPH.md).

This is not a claim that no unrelated form of ordinary conquest can ever change a province's owner. It addresses whole-realm Gorgon plot incorporation through the recovered source path. The unextracted Windows 1.03 payload remains outside this conclusion.

## Provenance and method

- The CD source is the supplied `RPGBGA.BIN`/`RPGBGA.CUE`; the cue identifies a `MODE1/2352` track. `WINBR.EXE` was extracted from the disc image and its hash matches the retained extracted file. The image SHA-256 is `62b0049a550d046f22e6707ff831df67b456f5959306556ef3569f587b3f945d`.
- The CD DOS `NOVA.EXE` has the same size and SHA-256 as the DOS 1.02 patch payload. The CD Windows `WINBR.EXE` and Windows 1.02 patch payload are different files, and were disassembled separately; both contain the same filter.
- The 1.02 patch readme identifies itself as “README 1.0.0.2” dated 8/22/97. The 1.04 self-extracting archive's listing contains both `NOVA.EXE` and `WINBR.EXE`. Patch-package hashes and sizes are recorded in [`REFERENCE_INVENTORY.md`](archive/REFERENCE_INVENTORY.md).
- The 1.03 Windows package is 1,726,333 bytes. Static inspection identified a GLBS/Wise NE installer; it is not a standard ZIP/RAR payload. No `WINBR.EXE` was recovered, so it is marked unverified rather than inferred from the DOS build.
- The EXEs were inspected statically with disassembly; none were executed. The only added project file for this task is this report. No game code, campaign data, original assets, or patch packages were modified.

## Conclusion

For the CD retail Windows and DOS executables and the available 1.02, DOS 1.03, and 1.04 payloads, the compiled Gorgon ally selector rejects realm IDs `3` and `9`. Thus the reported Anuire/Chimaeron takeover does not occur through this particular Gorgon plot selector in those builds. Windows 1.03 remains the material version gap; its behavior cannot be stated without recovering its executable payload safely.

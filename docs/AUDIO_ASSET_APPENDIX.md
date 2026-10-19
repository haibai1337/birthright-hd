# Audio investigation: overlooked loose files

2026-10-18. Companion to [the investigation report](AUDIO_ASSET_INVESTIGATION.md). These **194 file paths** are on the supplied disc but absent from the current imported catalog. They contain **188 distinct SHA-256 values** not represented by the existing catalog; identical bytes under different IDs remain separate paths. No sound files were imported or replaced.

All entries are RIFF PCM, mono, 22,050 Hz. Source symbols describe IDs; they do not prove every file is used in a reachable retail screen. Full hashes and physical/logical offsets are in [overlooked-loose-audio.json](../reference/extracted/audio-investigation/overlooked-loose-audio.json).

| Original CD path     |     Bytes | Seconds | Bits | Source identity / evidence                              |
| -------------------- | --------: | ------: | ---: | ------------------------------------------------------- |
| `WAVE00/102.WAV`     | 1,966,644 |  89.185 |    8 | Battle / personal combat music                          |
| `WAVE00/1020.WAV`    |    72,718 |   3.294 |    8 | SND_PLASMA_STREAK1                                      |
| `WAVE00/1024.WAV`    |    72,296 |   3.275 |    8 | SND_PLASMA_BALL1_1                                      |
| `WAVE00/1025.WAV`    |    72,296 |   3.275 |    8 | SND_PLASMA_BALL1_2                                      |
| `WAVE00/103.WAV`     | 1,979,384 |  44.883 |   16 | Credits music                                           |
| `WAVE00/105.WAV`     | 3,808,582 |  86.361 |   16 | Realm / domain music                                    |
| `WAVE00/112.WAV`     |   305,298 |   6.918 |   16 | SND_WIN_MUSIC1                                          |
| `WAVE00/113.WAV`     |   243,240 |   5.511 |   16 | SND_WIN_MUSIC2                                          |
| `WAVE00/114.WAV`     |   413,648 |   9.375 |   16 | SND_WIN_MUSIC3                                          |
| `WAVE00/115.WAV`     |   263,998 |   5.982 |   16 | SND_WIN_MUSIC4                                          |
| `WAVE00/116.WAV`     |   426,140 |   9.658 |   16 | SND_WIN_MUSIC5                                          |
| `WAVE00/117.WAV`     |   743,928 |  16.865 |   16 | Unassigned recording; no confirmed caller               |
| `WAVE00/118.WAV`     |   431,228 |   9.775 |   16 | SND_LOSE_MUSIC1                                         |
| `WAVE00/119.WAV`     |   819,250 |  18.573 |   16 | SND_LOSE_MUSIC2                                         |
| `WAVE00/120.WAV`     |   575,268 |  13.040 |   16 | SND_LOSE_MUSIC3                                         |
| `WAVE00/121.WAV`     |   617,226 |  13.991 |   16 | SND_LOSE_MUSIC4                                         |
| `WAVE00/122.WAV`     |   524,630 |  11.892 |   16 | SND_LOSE_MUSIC5                                         |
| `WAVE00/123.WAV`     |   785,038 |  17.797 |   16 | SND_LOSE_COMBAT_MUSIC1                                  |
| `WAVE00/124.WAV`     | 2,221,956 |  50.380 |   16 | SND_WIN_GAME_MUSIC1                                     |
| `WAVE00/1500.WAV`    |   142,500 |   6.459 |    8 | SND_CASTLE_ICON1                                        |
| `WAVE00/1520.WAV`    |    80,132 |   3.629 |    8 | SND_LAW_ICON1                                           |
| `WAVE00/1530.WAV`    |   173,111 |   7.845 |    8 | SND_RUINS_ICON1                                         |
| `WAVE00/1540.WAV`    |   149,263 |   6.763 |    8 | SND_SEAPORT_ICON1                                       |
| `WAVE00/1550.WAV`    |   107,472 |   4.872 |    8 | SND_SOURCE_ICON1                                        |
| `WAVE00/1560.WAV`    |   196,213 |   8.897 |    8 | SND_TEMPLE_ICON1                                        |
| `WAVE00/1570.WAV`    |    98,849 |   4.480 |    8 | SND_WIZTOWER_ICON1                                      |
| `WAVE00/2070.WAV`    |    72,962 |   3.303 |    8 | SND_SCROLL1                                             |
| `WAVE00/2071.WAV`    |    78,360 |   3.547 |    8 | SND_SCROLL2                                             |
| `WAVE00/2072.WAV`    |    88,598 |   4.012 |    8 | SND_SCROLL3                                             |
| `WAVE00/2170.WAV`    |   102,564 |   4.646 |    8 | SND_CROWN_SOUND1                                        |
| `WAVE00/2171.WAV`    |    88,822 |   4.023 |    8 | SND_CROWN_SOUND2                                        |
| `WAVE00/2180.WAV`    |    77,748 |   3.520 |    8 | SND_MASS_DESTRUCTION1                                   |
| `WAVE00/2190.WAV`    |    96,436 |   4.365 |    8 | SND_FIRESTORM1                                          |
| `WAVE00/2200.WAV`    |    69,630 |   3.152 |    8 | SND_GENERAL_MAGIC1                                      |
| `WAVE00/2220.WAV`    |   135,534 |   6.140 |    8 | SND_ICE_STORM1                                          |
| `WAVE00/2230.WAV`    |    67,956 |   3.076 |    8 | SND_LEVITATE1                                           |
| `WAVE00/2260.WAV`    |    71,130 |   3.222 |    8 | SND_RAZE1                                               |
| `WAVE00/2280.WAV`    |    81,044 |   3.667 |    8 | SND_STRENGTH1                                           |
| `WAVE00/2291.WAV`    |   181,848 |   8.241 |    8 | SND_HEAL2                                               |
| `WAVE00/530.WAV`     |    66,642 |   3.019 |    8 | SND_AMBIENT_GORGON_PAIN1                                |
| `WAVE00/7000.WAV`    |   101,324 |   4.590 |    8 | SND_AMBIENT_BEAST_SOUND1                                |
| `WAVE00/7001.WAV`    |    97,584 |   4.422 |    8 | SND_AMBIENT_BEAST_SOUND2                                |
| `WAVE00/7002.WAV`    |   292,832 |  13.276 |    8 | SND_AMBIENT_BEAST_SOUND3                                |
| `WAVE00/7003.WAV`    |    67,058 |   3.033 |    8 | SND_AMBIENT_BEAST_SOUND4                                |
| `WAVE00/7004.WAV`    |    95,624 |   4.333 |    8 | SND_AMBIENT_BEAST_SOUND5                                |
| `WAVE00/7005.WAV`    |    67,184 |   3.043 |    8 | SND_AMBIENT_BEAST_SOUND6                                |
| `WAVE00/7006.WAV`    |    80,602 |   3.647 |    8 | SND_AMBIENT_BEAST_SOUND7                                |
| `WAVE00/7008.WAV`    |   157,764 |   7.153 |    8 | SND_AMBIENT_DOG_SOUND1                                  |
| `WAVE00/7009.WAV`    |   193,670 |   8.781 |    8 | SND_AMBIENT_DOG_SOUND2                                  |
| `WAVE00/7010.WAV`    |   157,764 |   7.153 |    8 | SND_AMBIENT_DOG_SOUND3                                  |
| `WAVE00/7011.WAV`    |   238,006 |  10.792 |    8 | SND_AMBIENT_DOG_SOUND4                                  |
| `WAVE00/7012.WAV`    |   238,062 |  10.792 |    8 | SND_AMBIENT_DOG_SOUND5                                  |
| `WAVE00/7013.WAV`    |   249,530 |  11.313 |    8 | SND_AMBIENT_BUZZ1                                       |
| `WAVE00/7015.WAV`    |   130,606 |   5.920 |    8 | SND_DUNGEON1                                            |
| `WAVE00/7016.WAV`    |   157,506 |   7.140 |    8 | SND_DUNGEON2                                            |
| `WAVE00/7017.WAV`    |   208,620 |   9.458 |    8 | SND_DUNGEON3                                            |
| `WAVE00/7019.WAV`    |    77,004 |   3.487 |    8 | SND_ERRIE2                                              |
| `WAVE00/7020.WAV`    |    82,268 |   3.725 |    8 | SND_ERRIE3                                              |
| `WAVE00/7021.WAV`    |    90,032 |   4.080 |    8 | SND_EVIL1                                               |
| `WAVE00/7022.WAV`    |   107,976 |   4.893 |    8 | SND_EVIL2                                               |
| `WAVE00/7023.WAV`    |    84,418 |   3.826 |    8 | SND_AMBIENT_FOOTSTEPS1                                  |
| `WAVE00/7025.WAV`    |   179,726 |   8.149 |    8 | SND_AMBIENT_FOOTSTEPS3                                  |
| `WAVE00/7027.WAV`    |    78,412 |   3.551 |    8 | SND_AMBIENT_LAUGH2                                      |
| `WAVE00/7029.WAV`    |   191,650 |   8.690 |    8 | SND_AMBIENT_VOICES1                                     |
| `WAVE00/7030.WAV`    |   304,672 |  13.814 |    8 | SND_AMBIENT_VOICES2                                     |
| `WAVE00/7031.WAV`    |   314,306 |  14.251 |    8 | SND_AMBIENT_VOICES3                                     |
| `WAVE00/7032.WAV`    |   286,412 |  12.986 |    8 | SND_AMBIENT_VOICES4                                     |
| `WAVE00/7033.WAV`    |   141,914 |   6.430 |    8 | SND_AMBIENT_OGRE1                                       |
| `WAVE00/7034.WAV`    |    92,158 |   4.173 |    8 | SND_AMBIENT_OGRE2                                       |
| `WAVE00/7100.WAV`    |    80,354 |   3.641 |    8 | SND_THUNDER1                                            |
| `WAVE00/7101.WAV`    |    94,686 |   4.291 |    8 | SND_THUNDER2                                            |
| `WAVE00/7102.WAV`    |   107,538 |   4.873 |    8 | SND_THUNDER3                                            |
| `WAVE00/7103.WAV`    |   110,656 |   5.015 |    8 | SND_THUNDER4                                            |
| `WAVE00/7104.WAV`    |   112,314 |   5.090 |    8 | SND_THUNDER5                                            |
| `WAVE00/8080.WAV`    |    85,666 |   3.882 |    8 | SND_BATTLE_CHARGE1                                      |
| `WAVE00/8100.WAV`    |   176,536 |   8.000 |    8 | SND_INTRO_VOX1                                          |
| `WAVE00/8120.WAV`    |   153,706 |   6.964 |    8 | SND_WYVERN_MORPH1                                       |
| `WAVE00/8121.WAV`    |   158,228 |   7.170 |    8 | SND_WYVERN_MORPH2                                       |
| `WAVE00/8122.WAV`    |   234,876 |  10.648 |    8 | SND_WYVERN_MORPH3                                       |
| `WAVE00/8140.WAV`    |   127,538 |   5.778 |    8 | SND_INTRO_LOGO1                                         |
| `WAVE00/8141.WAV`    |   174,886 |   7.925 |    8 | SND_INTRO_LOGO2                                         |
| `WAVE00/8201.WAV`    |    78,550 |   3.556 |    8 | SND_BATTLE_HORN2                                        |
| `WAVE00/8202.WAV`    |    80,604 |   3.649 |    8 | SND_BATTLE_HORN3                                        |
| `WAVE00/8203.WAV`    |    90,210 |   4.085 |    8 | SND_BATTLE_HORN4                                        |
| `WAVE00/8204.WAV`    |    66,238 |   2.998 |    8 | SND_BATTLE_HORN5                                        |
| `WAVE00/8220.WAV`    |   127,402 |   5.774 |    8 | SND_THUMP1                                              |
| `WAVE00/8223.WAV`    |    87,182 |   3.948 |    8 | SND_DOOR_CREAK2                                         |
| `WAVE00/8224.WAV`    |   100,138 |   4.536 |    8 | SND_DOOR_CREAK3                                         |
| `WAVE00/8225.WAV`    |   104,842 |   4.749 |    8 | SND_DOOR_CREAK4                                         |
| `WAVE00/8235.WAV`    |   110,466 |   5.006 |    8 | SND_STONE_DOOR2                                         |
| `WAVE10/10158.WAV`   |    82,342 |   3.728 |    8 | SND_FEMALE_SCREAM4                                      |
| `WAVE10/10210.WAV`   |    81,556 |   3.692 |    8 | SND_FEMALE_DIE1                                         |
| `WAVE10/10211.WAV`   |    72,302 |   3.273 |    8 | SND_FEMALE_DIE2                                         |
| `WAVE20/20020.WAV`   |   129,222 |   5.855 |    8 | SND_DOG_DIE1                                            |
| `WAVE20/20050.WAV`   |    71,238 |   3.224 |    8 | SND_DOG_HOWL1                                           |
| `WAVE20/20051.WAV`   |    79,944 |   3.619 |    8 | SND_DOG_HOWL2                                           |
| `WAVE20/20055.WAV`   |    78,852 |   3.570 |    8 | SND_AMBIENT_DOG_HOWL1                                   |
| `WAVE20/20056.WAV`   |    88,490 |   4.007 |    8 | SND_AMBIENT_DOG_HOWL2                                   |
| `WAVE20/20207.WAV`   |    70,372 |   3.187 |    8 | SND_WOLF_SNARL8                                         |
| `WAVE20/20210.WAV`   |    98,520 |   4.462 |    8 | SND_WOLF_SNARL11                                        |
| `WAVE20/20420.WAV`   |    70,212 |   3.181 |    8 | SND_SPIDER_DIE1                                         |
| `WAVE20/20421.WAV`   |    66,148 |   2.996 |    8 | SND_SPIDER_DIE2                                         |
| `WAVE20/20500.WAV`   |    69,090 |   3.127 |    8 | SND_ANKHEG_DIE1                                         |
| `WAVE20/20501.WAV`   |    68,102 |   3.082 |    8 | SND_ANKHEG_DIE2                                         |
| `WAVE20/20600.WAV`   |    75,784 |   3.431 |    8 | SND_OGRE_DIE1                                           |
| `WAVE20/20601.WAV`   |    75,852 |   3.434 |    8 | SND_OGRE_DIE2                                           |
| `WAVE30/32131.WAV`   |    79,301 |   3.592 |    8 | SND_GENERAL_INTRO1                                      |
| `WAVE30/32133.WAV`   |    77,411 |   3.506 |    8 | SND_GENERAL_TROOP_REPORT1                               |
| `WAVE30/32134.WAV`   |    84,010 |   3.805 |    8 | SND_GENERAL1_INTRO1                                     |
| `WAVE30/32136.WAV`   |    82,007 |   3.715 |    8 | SND_GENERAL1_TROOP_REPORT1                              |
| `WAVE30/32137.WAV`   |    79,301 |   3.592 |    8 | SND_GENERAL2_INTRO1                                     |
| `WAVE30/32139.WAV`   |    77,412 |   3.506 |    8 | SND_GENERAL2_TROOP_REPORT1                              |
| `WAVE30/32141.WAV`   |   143,972 |   6.525 |    8 | SND_COUNSELLOR_INTRO1                                   |
| `WAVE30/32142.WAV`   |    88,676 |   4.017 |    8 | SND_COUNSELLOR_PROVINCE_REPORT1                         |
| `WAVE30/32144.WAV`   |   152,526 |   6.913 |    8 | SND_COUNSELLOR1_INTRO1                                  |
| `WAVE30/32145.WAV`   |    93,942 |   4.256 |    8 | SND_COUNSELLOR1_PROVINCE_REPORT1                        |
| `WAVE30/32146.WAV`   |    67,573 |   3.060 |    8 | SND_COUNSELLOR1_LOYALTY_REPORT1                         |
| `WAVE30/32147.WAV`   |   135,895 |   6.159 |    8 | SND_COUNSELLOR2_INTRO1                                  |
| `WAVE30/32148.WAV`   |    83,704 |   3.792 |    8 | SND_COUNSELLOR2_PROVINCE_REPORT1                        |
| `WAVE30/32151.WAV`   |    91,236 |   4.133 |    8 | SND_WIZARD_INTRO1                                       |
| `WAVE30/32152.WAV`   |    87,652 |   3.971 |    8 | SND_WIZARD_ADVENTURE_REPORT1                            |
| `WAVE30/32153.WAV`   |    81,955 |   3.712 |    8 | SND_WIZARD_INVESTITURE_REPORT1                          |
| `WAVE30/32154.WAV`   |    94,430 |   4.278 |    8 | SND_WIZARD1_INTRO1                                      |
| `WAVE30/32155.WAV`   |    92,857 |   4.207 |    8 | SND_WIZARD1_ADVENTURE_REPORT1                           |
| `WAVE30/32156.WAV`   |    84,214 |   3.815 |    8 | SND_WIZARD1_INVESTITURE_REPORT1                         |
| `WAVE30/32157.WAV`   |    69,313 |   3.139 |    8 | SND_WIZARD2_INTRO1                                      |
| `WAVE30/32158.WAV`   |    69,690 |   3.156 |    8 | SND_WIZARD2_ADVENTURE_REPORT1                           |
| `WAVE30/32159.WAV`   |    75,489 |   3.419 |    8 | SND_WIZARD2_INVESTITURE_REPORT1                         |
| `WAVE30/32161.WAV`   |   118,884 |   5.387 |    8 | SND_SPY_INTRO1                                          |
| `WAVE30/32162.WAV`   |   106,084 |   4.807 |    8 | SND_SPY_ALLIANCE_REPORT1                                |
| `WAVE30/32164.WAV`   |   125,946 |   5.707 |    8 | SND_SPY1_INTRO1                                         |
| `WAVE30/32165.WAV`   |   112,385 |   5.092 |    8 | SND_SPY1_ALLIANCE_REPORT1                               |
| `WAVE30/32167.WAV`   |   112,216 |   5.085 |    8 | SND_SPY2_INTRO1                                         |
| `WAVE30/32168.WAV`   |   100,135 |   4.537 |    8 | SND_SPY2_ALLIANCE_REPORT1                               |
| `WAVE30/32200.WAV`   |   101,332 |   4.590 |    8 | SND_SERVANT_VOX1                                        |
| `WAVE30/32201.WAV`   |   120,810 |   5.473 |    8 | SND_SERVANT_VOX2                                        |
| `WAVE30/32202.WAV`   |   128,732 |   5.833 |    8 | SND_SERVANT_VOX3                                        |
| `WAVE30/32220.WAV`   |    81,416 |   3.687 |    8 | SND_GORGON_VOX1                                         |
| `WAVE30/32221.WAV`   |   103,502 |   4.688 |    8 | SND_GORGON_VOX2                                         |
| `WAVE30/32222.WAV`   |   100,230 |   4.540 |    8 | SND_GORGON_VOX3                                         |
| `WAVE30/32223.WAV`   |    77,302 |   3.500 |    8 | SND_GORGON_VOX4                                         |
| `WAVE30/32240.WAV`   |    73,360 |   3.321 |    8 | SND_GORGON_VOX_EGG1                                     |
| `WAVE30/32421.WAV`   | 8,937,790 | 202.666 |   16 | SND_INTRO_FLC_VOX1                                      |
| `WAVE30/34864.WAV`   |    73,806 |   3.342 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE30/34865.WAV`   |    67,014 |   3.035 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/39473.WAV`  |    84,780 |   3.839 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/39474.WAV`  |    87,418 |   3.959 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/39488.WAV`  |    83,794 |   3.795 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/39489.WAV`  |    79,686 |   3.608 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/39490.WAV`  |    74,612 |   3.378 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/39985.WAV`  |    66,396 |   3.006 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/41009.WAV`  |    67,706 |   3.066 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/41010.WAV`  |    68,672 |   3.110 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/41520.WAV`  |    71,484 |   3.237 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/43568.WAV`  |    73,748 |   3.338 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/43569.WAV`  |    82,376 |   3.730 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/43570.WAV`  |   131,720 |   5.967 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/43585.WAV`  |    90,068 |   4.078 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44032.WAV`  |   125,940 |   5.706 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44033.WAV`  |   104,964 |   4.755 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44034.WAV`  |    65,694 |   2.974 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44080.WAV`  |    71,988 |   3.259 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44081.WAV`  |   125,940 |   5.706 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44082.WAV`  |   104,964 |   4.755 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44096.WAV`  |    71,638 |   3.243 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44097.WAV`  |    65,694 |   2.974 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44544.WAV`  |    73,840 |   3.343 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44545.WAV`  |   106,386 |   4.819 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44546.WAV`  |    89,472 |   4.052 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44592.WAV`  |    73,840 |   3.343 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44593.WAV`  |   117,984 |   5.345 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44594.WAV`  |   106,386 |   4.819 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44608.WAV`  |    93,338 |   4.227 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44609.WAV`  |    89,472 |   4.052 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/44610.WAV`  |   108,802 |   4.929 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/45122.WAV`  |    70,070 |   3.172 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/46592.WAV`  |   100,564 |   4.555 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/46593.WAV`  |   104,714 |   4.745 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/46594.WAV`  |    89,722 |   4.063 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/46640.WAV`  |    92,945 |   4.211 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/46641.WAV`  |   124,642 |   5.648 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/46642.WAV`  |   122,372 |   5.545 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/46656.WAV`  |   114,807 |   5.202 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/46657.WAV`  |   105,785 |   4.793 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVE384/46658.WAV`  |    66,094 |   2.994 |    8 | Numbered voice resource; exact speaker/cue not resolved |
| `WAVELOOP/50000.WAV` |   242,638 |  11.000 |    8 | SND_BATTLE_LOOP1                                        |
| `WAVELOOP/50200.WAV` |   330,764 |  14.997 |    8 | SND_FIRE_LOOP1                                          |
| `WAVELOOP/50220.WAV` |   119,942 |   5.433 |    8 | SND_TORCH_LOOP1                                         |
| `WAVELOOP/50240.WAV` |   102,902 |   4.660 |    8 | SND_FOUNTAIN_LOOP1                                      |
| `WAVELOOP/50250.WAV` |    75,048 |   3.400 |    8 | SND_UI_MAP_NAVIGATE_LOOP                                |
| `WAVELOOP/50300.WAV` |    77,686 |   3.517 |    8 | SND_DRUM_ROLL_LOOP                                      |
| `WAVELOOP/50385.WAV` |    68,164 |   3.088 |    8 | SND_MOVING_FLOOR_LOOP2                                  |
| `WAVELOOP/50390.WAV` |    68,644 |   3.110 |    8 | SND_MOVING_FLOOR_LOOP3                                  |
| `WAVELOOP/50395.WAV` |    85,178 |   3.859 |    8 | SND_MOVING_FLOOR_LOOP4                                  |

The 202.666-second `WAVE30/32421.WAV` is identified by `SND_INTRO_FLC_VOX1` and the intro call site; duration alone is not grounds to classify it as background music. `117.WAV` is present, but the victory randomizer selects 112–116, so 117 is not asserted to be used.

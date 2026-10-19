/** Verified numeric IDs and paths from the disc, retail loader and SOUNDFX table.
 * No classification here depends on recording length.
 */
export function originalAudioIdentity(source: string) {
  const audioId = Number(
    source
      .split('/')
      .at(-1)
      ?.replace(/\.WAV$/i, ''),
  );
  let audioRole = 'effect';
  if (source.startsWith('MUSIC/')) audioRole = 'adventure';
  else if (audioId === 102) audioRole = 'battle';
  else if (audioId === 103) audioRole = 'credits';
  else if (audioId === 105) audioRole = 'realm';
  else if (audioId >= 112 && audioId <= 116) audioRole = 'victory';
  else if (audioId >= 118 && audioId <= 122) audioRole = 'defeat';
  else if (audioId === 123) audioRole = 'combat-defeat';
  else if (audioId === 124) audioRole = 'finale';
  else if (audioId === 117) audioRole = 'unassigned';
  else if (audioId === 32421) audioRole = 'intro-narration';
  else if (/^WAVE(?:30|384)\//.test(source)) audioRole = 'voice';
  else if (source.startsWith('WAVELOOP/')) audioRole = 'ambience';
  return {
    audioId,
    audioRole,
    category: ['adventure', 'realm', 'battle', 'credits'].includes(audioRole)
      ? 'music'
      : ['victory', 'defeat', 'combat-defeat', 'finale'].includes(audioRole)
        ? 'music-cue'
        : audioRole === 'unassigned'
          ? 'unassigned-audio'
          : ['voice', 'intro-narration'].includes(audioRole)
            ? 'voice'
            : 'effects',
  };
}
export const originalMusic = {
  // Preserve the existing menu presentation; its exact retail assignment remains unverified.
  menu: 'MUSIC/106.WAV',
  campaign: 'WAVE00/105.WAV',
  battle: 'WAVE00/102.WAV',
  credits: 'WAVE00/103.WAV',
  victory: [112, 113, 114, 115, 116].map((id) => `WAVE00/${id}.WAV`),
  defeat: [118, 119, 120, 121, 122].map((id) => `WAVE00/${id}.WAV`),
  combatDefeat: 'WAVE00/123.WAV',
  finale: 'WAVE00/124.WAV',
  adventures: Object.fromEntries(
    [1, 3, 4, 6, 7, 8, 9, 10, 11].map((cue) => [cue, `MUSIC/${cue + 100}.WAV`]),
  ),
  campaignFallback: false,
  note: 'Original realm and battle recordings recovered from WAVE00 on the supplied disc.',
};
export const originalEffects = {
  click: 'WAVE/8010.WAV',
  order: 'WAVE/8010.WAV',
  error: 'WAVE/8015.WAV',
  council: 'WAVE/8020.WAV', // SND_UI_STATUS_REPORT, a short interface cue, not advisor dialogue.
  magic: 'WAVE00/2200.WAV', // SND_GENERAL_MAGIC1.
};

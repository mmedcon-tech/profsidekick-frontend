const MALE_VOICE_PATTERN =
  /daniel|alex|david|james|fred|thomas|oliver|gordon|lee|aaron|nathan|raj|rishi|male|jamal|omar|khalid|tom|fred/i;
const FEMALE_VOICE_PATTERN =
  /samantha|karen|victoria|zira|susan|kate|fiona|anna|melina|nora|tessa|female|sara|hoda|salma|ava|allison/i;
const PREMIUM_VOICE_PATTERN =
  /premium|enhanced|neural|natural|wavenet|siri|google.*english|online/i;

export type SpeechVoiceGender = 'male' | 'female';

function scoreVoice(
  voice: SpeechSynthesisVoice,
  gender: SpeechVoiceGender,
): number {
  const prefers = gender === 'male' ? MALE_VOICE_PATTERN : FEMALE_VOICE_PATTERN;
  const avoids = gender === 'male' ? FEMALE_VOICE_PATTERN : MALE_VOICE_PATTERN;
  let score = 0;

  if (prefers.test(voice.name)) score += 12;
  if (avoids.test(voice.name)) score -= 24;
  if (PREMIUM_VOICE_PATTERN.test(voice.name)) score += 18;
  if (voice.localService === false) score += 8;

  const lang = voice.lang.toLowerCase();
  if (lang.startsWith('en-gb') || lang.startsWith('en-us')) score += 6;
  else if (lang.startsWith('en')) score += 3;
  else if (lang.startsWith('ar')) score += 2;

  return score;
}

export function pickSpeechVoice(
  gender: SpeechVoiceGender,
  voices: SpeechSynthesisVoice[] = [],
): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;

  const ranked = [...voices].sort(
    (a, b) => scoreVoice(b, gender) - scoreVoice(a, gender),
  );

  const best = ranked[0];
  if (best && scoreVoice(best, gender) > 0) return best;

  const prefers = gender === 'male' ? MALE_VOICE_PATTERN : FEMALE_VOICE_PATTERN;
  const avoids = gender === 'male' ? FEMALE_VOICE_PATTERN : MALE_VOICE_PATTERN;
  return (
    voices.find((voice) => prefers.test(voice.name) && !avoids.test(voice.name)) ??
    voices.find((voice) => !avoids.test(voice.name)) ??
    voices[0]
  );
}

export function loadSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve([]);
  }

  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const finish = (): void => {
      window.speechSynthesis.removeEventListener('voiceschanged', finish);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', finish);
    window.speechSynthesis.getVoices();
    window.setTimeout(finish, 400);
  });
}

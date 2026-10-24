import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chunkText,
  describeBrowser,
  describeSpeechError,
  languageLabel,
  pickFallbackVoice,
  pickVoice,
  toVoiceOptions,
  troubleshootingHint,
} from '../src/utils/tts.ts';
import type { VoiceOption } from '../src/utils/tts.ts';

function voice(overrides: Partial<VoiceOption>): VoiceOption {
  return {
    voiceURI: 'voice-x',
    name: 'Voice X',
    lang: 'en-US',
    localService: true,
    isDefault: false,
    ...overrides,
  };
}

test('chunkText: empty and whitespace input produce no speech', () => {
  assert.deepEqual(chunkText(''), []);
  assert.deepEqual(chunkText('   \n\t  '), []);
});

test('chunkText: short text stays in one chunk', () => {
  assert.deepEqual(chunkText('Hello world.'), ['Hello world.']);
});

test('chunkText: long text respects the limit and preserves every word', () => {
  const text =
    'This is a moderately long sentence that should be packed carefully without losing any words. '.repeat(8);
  const chunks = chunkText(text, 120);

  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    assert.ok(chunk.length <= 120, `chunk too long: ${chunk.length}`);
  }
  assert.equal(
    chunks.join(' ').replace(/\s+/g, ' '),
    text.replace(/\s+/g, ' ').trim(),
  );
});

test('chunkText: prefers sentence boundaries over mid-sentence cuts', () => {
  assert.deepEqual(
    chunkText('First sentence. Second sentence. Third sentence.', 20),
    ['First sentence.', 'Second sentence.', 'Third sentence.'],
  );
});

test('chunkText: hard-splits a single word longer than the limit', () => {
  assert.deepEqual(chunkText('A'.repeat(25), 10), ['AAAAAAAAAA', 'AAAAAAAAAA', 'AAAAA']);
});

test('chunkText: never emits empty chunks', () => {
  const chunks = chunkText('One. Two. Three. Four. Five.', 8);
  assert.ok(chunks.every(chunk => chunk.length > 0));
});

test('pickVoice: exact preferred voice wins', () => {
  const voices = [
    voice({ voiceURI: 'a', name: 'A', lang: 'en-US', isDefault: true }),
    voice({ voiceURI: 'b', name: 'B', lang: 'fr-FR' }),
  ];
  assert.equal(pickVoice(voices, 'b', 'en-US')?.voiceURI, 'b');
});

test('pickVoice: falls back to the requested language, then default, then first', () => {
  const voices = [
    voice({ voiceURI: 'fr', name: 'FR', lang: 'fr-FR' }),
    voice({ voiceURI: 'en', name: 'EN', lang: 'en-GB' }),
    voice({ voiceURI: 'de', name: 'DE', lang: 'de-DE', isDefault: true }),
  ];
  assert.equal(pickVoice(voices, 'missing', 'en-US')?.voiceURI, 'en');
  assert.equal(pickVoice(voices, 'missing', 'ja-JP')?.voiceURI, 'de');
  assert.equal(pickVoice([voice({ voiceURI: 'only', lang: 'es-ES' })], '', 'en-US')?.voiceURI, 'only');
  assert.equal(pickVoice([], '', 'en-US'), undefined);
});

test('toVoiceOptions: deduplicates and sorts by language then name', () => {
  const raw = [
    { voiceURI: 'b', name: 'Beta', lang: 'fr-FR', localService: true, default: false },
    { voiceURI: 'a', name: 'Alpha', lang: 'en-US', localService: false, default: true },
    { voiceURI: 'a', name: 'Alpha duplicate', lang: 'en-US', localService: false, default: true },
  ] as unknown as SpeechSynthesisVoice[];

  const options = toVoiceOptions(raw);
  assert.equal(options.length, 2);
  assert.deepEqual(options.map(option => option.voiceURI), ['a', 'b']);
  assert.equal(options[0].isDefault, true);
  assert.equal(options[0].localService, false);
});

test('pickVoice: prefers a local voice over a network voice in the same language', () => {
  const voices = [
    voice({ voiceURI: 'net', name: 'Net', lang: 'en-US', localService: false }),
    voice({ voiceURI: 'local', name: 'Local', lang: 'en-US', localService: true }),
  ];
  assert.equal(pickVoice(voices, '', 'en-US')?.voiceURI, 'local');
});

test('pickFallbackVoice: never retries the network voice that just failed', () => {
  const voices = [
    voice({ voiceURI: 'net-af', name: 'Adri Online', lang: 'af-ZA', localService: false, isDefault: true }),
    voice({ voiceURI: 'net-en', name: 'Aria Online', lang: 'en-US', localService: false }),
    voice({ voiceURI: 'local-en', name: 'David', lang: 'en-US', localService: true }),
  ];
  const fallback = pickFallbackVoice(voices, 'af-ZA', 'en-US');
  assert.equal(fallback?.voiceURI, 'local-en');
  assert.equal(fallback?.localService, true);
});

test('pickFallbackVoice: matches the failed voice language first, then the browser language', () => {
  const voices = [
    voice({ voiceURI: 'local-de', name: 'Katja', lang: 'de-DE', localService: true }),
    voice({ voiceURI: 'local-fr', name: 'Julie', lang: 'fr-FR', localService: true }),
  ];
  assert.equal(pickFallbackVoice(voices, 'fr-FR', 'en-US')?.voiceURI, 'local-fr');
  assert.equal(pickFallbackVoice(voices, 'ja-JP', 'de-AT')?.voiceURI, 'local-de');
  assert.equal(pickFallbackVoice([], 'en-US'), undefined);
});

test('pickFallbackVoice: falls back to any voice when none are local', () => {
  const voices = [
    voice({ voiceURI: 'net-1', name: 'One', lang: 'en-US', localService: false }),
    voice({ voiceURI: 'net-2', name: 'Two', lang: 'en-GB', localService: false }),
  ];
  assert.equal(pickFallbackVoice(voices, 'en-US')?.voiceURI, 'net-1');
});

test('describeBrowser: identifies Opera, Edge, Chrome, Firefox and Safari', () => {
  assert.equal(describeBrowser('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 OPR/118.0'), 'Opera (Chromium)');
  assert.equal(describeBrowser('Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36 Edg/140.0'), 'Microsoft Edge');
  assert.equal(describeBrowser('Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36'), 'Google Chrome');
  assert.equal(describeBrowser('Mozilla/5.0 Gecko/20100101 Firefox/142.0'), 'Mozilla Firefox');
  assert.equal(describeBrowser('Mozilla/5.0 Version/18.0 Safari/605.1.15'), 'Safari');
  assert.equal(describeBrowser(''), 'Unknown browser');
});

test('languageLabel: returns a human readable language name', () => {
  assert.ok(languageLabel('en-US').length > 0);
  assert.ok(languageLabel('fr-FR').length > 0);
});

test('troubleshootingHint: explains missing voices and blocked playback', () => {
  assert.match(
    troubleshootingHint({ error: null, voiceCount: 0, browser: 'Opera (Chromium)' }),
    /Opera|voices/i,
  );
  assert.match(
    troubleshootingHint({ error: describeSpeechError('not-allowed'), voiceCount: 2, browser: 'Opera (Chromium)' }),
    /click/i,
  );
});

test('describeSpeechError: maps browser error codes to useful text', () => {
  assert.match(describeSpeechError('not-allowed'), /blocked/i);
  assert.match(describeSpeechError('audio-busy'), /busy/i);
  assert.match(describeSpeechError('network'), /network/i);
  assert.match(describeSpeechError('voice-unavailable'), /not available/i);
  assert.match(describeSpeechError('weird-code'), /weird-code/);
});

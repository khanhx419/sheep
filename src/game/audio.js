// Small synthesized soundscape: no external audio downloads or autoplay.
let context;
let muted = false;
let ambient;
export function setMuted(value) {
  muted = value;
  if (ambient && context) ambient.gain.setTargetAtTime(value ? 0 : 0.012, context.currentTime, 0.2);
}
export function unlockAudio() {
  try {
    context ||= new (window.AudioContext || window.webkitAudioContext)();
    context.resume().catch(() => {});
  } catch { /* Sound is optional on unsupported browsers. */ }
}
function tone(frequency, duration, type = 'sine', volume = 0.06, end = frequency, delay = 0) {
  if (!context || muted) return;
  const now = context.currentTime + delay;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain).connect(context.destination);
  osc.start(now); osc.stop(now + duration + 0.02);
}
function noise(duration = 0.25, volume = 0.1) {
  if (!context || muted) return;
  const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = context.createBufferSource(); source.buffer = buffer;
  const gain = context.createGain(); gain.gain.value = volume;
  const filter = context.createBiquadFilter(); filter.frequency.value = 1800;
  source.connect(filter).connect(gain).connect(context.destination); source.start();
}
export function sound(name) {
  if (name === 'bark') { tone(150, 0.15, 'sawtooth', 0.08, 75); noise(0.1, 0.1); tone(170, 0.18, 'triangle', 0.08, 80, 0.23); }
  if (name === 'bleat') { tone(430, 0.25, 'triangle', 0.04, 330); tone(360, 0.25, 'triangle', 0.035, 290, 0.18); }
  if (name === 'click') tone(520, 0.1, 'sine', 0.025, 760);
  if (name === 'hit') { noise(0.18, 0.13); tone(110, 0.2, 'triangle', 0.08, 45); }
  if (name === 'block') { tone(780, 0.2, 'triangle', 0.07, 230); noise(0.1, 0.06); }
  if (name === 'buy' || name === 'win') { tone(440, 0.3); tone(660, 0.3, 'sine', 0.05, 660, 0.12); tone(880, 0.5, 'sine', 0.04, 880, 0.24); }
  if (name === 'reveal' || name === 'howl') {
    if (name === 'reveal') noise(0.65, 0.17);
    // Two slightly detuned voices create an audible rising/falling wolf howl.
    tone(160, 0.6, 'sawtooth', 0.035, 430, 0.2);
    tone(165, 0.6, 'triangle', 0.09, 440, 0.2);
    tone(430, 1.8, 'triangle', 0.1, 190, 0.8);
    tone(435, 1.8, 'sine', 0.07, 185, 0.8);
  }
}
export function ambience(enabled) {
  if (ambient) { ambient.gain.setTargetAtTime(0, context.currentTime, 0.2); const previous = ambient; setTimeout(() => { previous.source.stop(); previous.source.disconnect(); }, 600); ambient = null; }
  if (!enabled || !context) return;
  const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02; data[i] = last * 3; }
  const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
  const gain = context.createGain(); gain.gain.value = muted ? 0 : 0.012;
  source.connect(gain).connect(context.destination); source.start(); ambient = { source, gain: gain.gain };
}

/**
 * Synthesised sound effects. They are mixed with the microphone into one stream,
 * so the recorded video contains both the user's voice and the effects.
 */
export class Sfx {
  private ctx = new AudioContext();
  private dest = this.ctx.createMediaStreamDestination();
  private out = this.ctx.createGain();

  constructor(mic: MediaStream | null) {
    this.out.gain.value = 0.5;
    this.out.connect(this.dest);
    this.out.connect(this.ctx.destination);
    if (mic && mic.getAudioTracks().length > 0) this.ctx.createMediaStreamSource(mic).connect(this.dest);
  }

  /** Audio-only stream: microphone + effects. */
  get stream(): MediaStream { return this.dest.stream; }

  resume() { void this.ctx.resume(); }
  close() { void this.ctx.close(); }

  private tone(freq: number, dur: number, at = 0, vol = 0.5, type: OscillatorType = "sine", to?: number) {
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(dur: number, from: number, to: number, vol: number, at = 0) {
    const t = this.ctx.currentTime + at;
    const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.out);
    src.start(t);
  }

  tick() { this.tone(520, 0.08, 0, 0.3, "square"); }
  pick() { this.tone(660, 0.12, 0, 0.4, "triangle"); this.tone(990, 0.18, 0.08, 0.35, "triangle"); }
  whoosh() { this.noise(0.5, 400, 3000, 0.5); }
  whistle() { this.tone(2600, 0.5, 0, 0.25, "sine", 3000); }
  cheer() { this.noise(1.6, 900, 1500, 0.8); this.tone(440, 0.2, 0, 0.2); }
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.35, i * 0.12, 0.35, "triangle")); this.cheer(); }
}

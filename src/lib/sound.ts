import type { AmbientKind } from '../types/study';

/**
 * All audio is synthesised with the Web Audio API — no asset files and no
 * network requests, so the app keeps working fully offline.
 */

export type Cue =
  | 'click'
  | 'start'
  | 'pause'
  | 'complete'
  | 'breakOver'
  | 'levelUp'
  | 'achievement';

const NOISE_SECONDS = 3;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientNodes: AudioNode[] = [];
  private ambientTimers: number[] = [];
  private whiteBuffer: AudioBuffer | null = null;
  private brownBuffer: AudioBuffer | null = null;
  private currentAmbient: AmbientKind = 'silent';
  private cuesEnabled = true;
  private ambientVolume = 0.5;

  setCuesEnabled(enabled: boolean): void {
    this.cuesEnabled = enabled;
  }

  get ambient(): AmbientKind {
    return this.currentAmbient;
  }

  /** Must be called from inside a user gesture the first time. */
  async resume(): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // The browser will let us try again on the next gesture.
      }
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      const ctx = new Ctor();
      this.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      this.master = master;
      const ambient = ctx.createGain();
      ambient.gain.value = 0;
      ambient.connect(master);
      this.ambientGain = ambient;
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  private noise(kind: 'white' | 'brown'): AudioBuffer | null {
    const ctx = this.ensureContext();
    if (!ctx) return null;
    const cached = kind === 'white' ? this.whiteBuffer : this.brownBuffer;
    if (cached) return cached;

    const length = Math.floor(ctx.sampleRate * NOISE_SECONDS);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    if (kind === 'white') {
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      this.whiteBuffer = buffer;
    } else {
      let last = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      }
      this.brownBuffer = buffer;
    }
    return buffer;
  }

  private tone(
    freq: number,
    start: number,
    duration: number,
    gain: number,
    type: OscillatorType = 'sine',
  ): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(gain, start + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(env);
    env.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  play(cue: Cue): void {
    if (!this.cuesEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;

    switch (cue) {
      case 'click':
        this.tone(660, t, 0.07, 0.05, 'triangle');
        break;
      case 'start':
        this.tone(523.25, t, 0.16, 0.1);
        this.tone(783.99, t + 0.09, 0.2, 0.08);
        break;
      case 'pause':
        this.tone(392, t, 0.14, 0.08);
        this.tone(261.63, t + 0.08, 0.2, 0.06);
        break;
      case 'complete':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.tone(f, t + i * 0.11, 0.5, 0.11);
        });
        break;
      case 'breakOver':
        [659.25, 523.25, 659.25].forEach((f, i) => {
          this.tone(f, t + i * 0.13, 0.3, 0.09, 'triangle');
        });
        break;
      case 'levelUp':
        [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => {
          this.tone(f, t + i * 0.08, 0.6, 0.1);
        });
        this.tone(130.81, t, 0.9, 0.05);
        break;
      case 'achievement':
        this.tone(880, t, 0.22, 0.09, 'triangle');
        this.tone(1174.66, t + 0.12, 0.34, 0.08, 'triangle');
        break;
    }
  }

  setAmbientVolume(volume: number): void {
    this.ambientVolume = Math.min(1, Math.max(0, volume));
    const ctx = this.ctx;
    if (ctx && this.ambientGain && this.currentAmbient !== 'silent') {
      this.ambientGain.gain.setTargetAtTime(this.ambientVolume * 0.5, ctx.currentTime, 0.2);
    }
  }

  setAmbient(kind: AmbientKind): void {
    if (kind === this.currentAmbient) return;
    this.stopAmbient();
    if (kind === 'silent') return;

    const ctx = this.ensureContext();
    const ambientGain = this.ambientGain;
    if (!ctx || !ambientGain) return;
    this.currentAmbient = kind;

    if (kind === 'rain') this.buildRain();
    else if (kind === 'forest') this.buildForest();
    else if (kind === 'fireplace') this.buildFireplace();
    else if (kind === 'ocean') this.buildOcean();

    ambientGain.gain.cancelScheduledValues(ctx.currentTime);
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, ctx.currentTime);
    ambientGain.gain.linearRampToValueAtTime(this.ambientVolume * 0.5, ctx.currentTime + 1.2);
  }

  stopAmbient(): void {
    const ctx = this.ctx;
    this.currentAmbient = 'silent';
    for (const timer of this.ambientTimers) window.clearTimeout(timer);
    this.ambientTimers = [];
    if (ctx && this.ambientGain) {
      this.ambientGain.gain.cancelScheduledValues(ctx.currentTime);
      this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, ctx.currentTime);
      this.ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    }
    const nodes = this.ambientNodes;
    this.ambientNodes = [];
    window.setTimeout(() => {
      for (const node of nodes) {
        try {
          const maybeSource = node as AudioBufferSourceNode;
          if (typeof maybeSource.stop === 'function') maybeSource.stop();
        } catch {
          // Already stopped.
        }
        try {
          node.disconnect();
        } catch {
          // Already disconnected.
        }
      }
    }, 600);
  }

  private loopSource(kind: 'white' | 'brown'): AudioBufferSourceNode | null {
    const ctx = this.ensureContext();
    const buffer = this.noise(kind);
    if (!ctx || !buffer) return null;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.start();
    this.ambientNodes.push(source);
    return source;
  }

  private buildRain(): void {
    const ctx = this.ctx;
    const out = this.ambientGain;
    if (!ctx || !out) return;
    const body = this.loopSource('white');
    const hiss = this.loopSource('white');
    if (!body || !hiss) return;

    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 1400;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 320;
    const bodyGain = ctx.createGain();
    bodyGain.gain.value = 0.85;
    body.connect(high);
    high.connect(low);
    low.connect(bodyGain);
    bodyGain.connect(out);

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 5200;
    band.Q.value = 0.7;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.2;
    hiss.connect(band);
    band.connect(hissGain);
    hissGain.connect(out);

    this.ambientNodes.push(low, high, band, bodyGain, hissGain);
  }

  private buildOcean(): void {
    const ctx = this.ctx;
    const out = this.ambientGain;
    if (!ctx || !out) return;
    const source = this.loopSource('white');
    if (!source) return;

    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 900;
    const swell = ctx.createGain();
    swell.gain.value = 0.5;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.36;
    lfo.connect(lfoGain);
    lfoGain.connect(swell.gain);
    lfo.start();

    const sweep = ctx.createOscillator();
    sweep.frequency.value = 0.21;
    const sweepGain = ctx.createGain();
    sweepGain.gain.value = 260;
    sweep.connect(sweepGain);
    sweepGain.connect(low.frequency);
    sweep.start();

    source.connect(low);
    low.connect(swell);
    swell.connect(out);
    this.ambientNodes.push(low, swell, lfo, lfoGain, sweep, sweepGain);
  }

  private buildFireplace(): void {
    const ctx = this.ctx;
    const out = this.ambientGain;
    if (!ctx || !out) return;
    const source = this.loopSource('brown');
    if (!source) return;

    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 520;
    const gain = ctx.createGain();
    gain.gain.value = 0.7;
    source.connect(low);
    low.connect(gain);
    gain.connect(out);
    this.ambientNodes.push(low, gain);

    const crackle = (): void => {
      const liveCtx = this.ctx;
      const liveOut = this.ambientGain;
      if (this.currentAmbient !== 'fireplace' || !liveCtx || !liveOut) return;
      const buffer = this.noise('white');
      if (buffer) {
        const now = liveCtx.currentTime;
        const pop = liveCtx.createBufferSource();
        pop.buffer = buffer;
        const env = liveCtx.createGain();
        const band = liveCtx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = 1100 + Math.random() * 2600;
        band.Q.value = 1.3;
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(0.22 + Math.random() * 0.28, now + 0.004);
        env.gain.exponentialRampToValueAtTime(0.0001, now + 0.08 + Math.random() * 0.1);
        pop.connect(band);
        band.connect(env);
        env.connect(liveOut);
        pop.start(now, Math.random() * 2, 0.25);
        pop.stop(now + 0.35);
      }
      this.ambientTimers.push(window.setTimeout(crackle, 180 + Math.random() * 900));
    };
    this.ambientTimers.push(window.setTimeout(crackle, 400));
  }

  private buildForest(): void {
    const ctx = this.ctx;
    const out = this.ambientGain;
    if (!ctx || !out) return;
    const source = this.loopSource('brown');
    if (!source) return;

    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 760;
    const gain = ctx.createGain();
    gain.gain.value = 0.45;

    const breeze = ctx.createOscillator();
    breeze.frequency.value = 0.13;
    const breezeGain = ctx.createGain();
    breezeGain.gain.value = 0.2;
    breeze.connect(breezeGain);
    breezeGain.connect(gain.gain);
    breeze.start();

    source.connect(low);
    low.connect(gain);
    gain.connect(out);
    this.ambientNodes.push(low, gain, breeze, breezeGain);

    const chirp = (): void => {
      const liveCtx = this.ctx;
      const liveOut = this.ambientGain;
      if (this.currentAmbient !== 'forest' || !liveCtx || !liveOut) return;
      const now = liveCtx.currentTime;
      const notes = 2 + Math.floor(Math.random() * 3);
      const base = 1900 + Math.random() * 1500;
      for (let i = 0; i < notes; i += 1) {
        const at = now + i * (0.07 + Math.random() * 0.06);
        const osc = liveCtx.createOscillator();
        const env = liveCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.35), at);
        osc.frequency.exponentialRampToValueAtTime(base * 1.25, at + 0.05);
        env.gain.setValueAtTime(0.0001, at);
        env.gain.linearRampToValueAtTime(0.04, at + 0.01);
        env.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
        osc.connect(env);
        env.connect(liveOut);
        osc.start(at);
        osc.stop(at + 0.16);
      }
      this.ambientTimers.push(window.setTimeout(chirp, 2600 + Math.random() * 7000));
    };
    this.ambientTimers.push(window.setTimeout(chirp, 1800));
  }
}

export const sound = new SoundEngine();

export const AMBIENT_OPTIONS: { kind: AmbientKind; label: string; icon: string }[] = [
  { kind: 'silent', label: 'Silent', icon: '🔇' },
  { kind: 'rain', label: 'Rain', icon: '🌧' },
  { kind: 'forest', label: 'Forest', icon: '🌲' },
  { kind: 'fireplace', label: 'Fireplace', icon: '🔥' },
  { kind: 'ocean', label: 'Ocean', icon: '🌊' },
];

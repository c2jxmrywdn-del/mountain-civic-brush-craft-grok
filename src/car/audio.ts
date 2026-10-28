/**
 * Layered exhaust note. The rpm model always runs so the cluster still
 * moves if Web Audio is missing or muted. Sound starts only from start(),
 * which the studio calls after a click.
 */
export class EngineAudio {
  rpm = 0;
  throttle = 0;
  running = false;
  muted = false;
  get contextState() {
    return this.ctx?.state ?? (this.available ? "unstarted" : "unavailable");
  }

  private phase: "off" | "crank" | "run" | "spin" = "off";
  private crank = 0;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private osc: OscillatorNode[] = [];
  private oscGain: GainNode[] = [];
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private readonly harmonics = [1, 2, 3.02, 4.2, 5.7];
  private readonly gains = [0.42, 0.22, 0.12, 0.07, 0.04];

  start() {
    if (this.phase === "run" || this.phase === "crank") return;
    this.ensure();
    this.running = true;
    this.phase = "crank";
    this.crank = 0;
    this.rpm = 220;
    void this.ctx?.resume();
  }

  stop() {
    if (this.phase === "off" || this.phase === "spin") return;
    this.phase = "spin";
  }

  setThrottle(value: number) {
    this.throttle = Math.min(1, Math.max(0, value));
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyLevel();
  }

  update(dt: number) {
    const d = Math.min(Math.max(dt, 0), 0.1);
    if (this.phase === "crank") {
      this.crank += d;
      this.rpm = 220 + this.crank * 2600;
      if (this.crank > 0.62) {
        this.phase = "run";
        this.rpm = 1500;
      }
    } else if (this.phase === "spin") {
      this.rpm = Math.max(0, this.rpm - d * 2200);
      if (this.rpm < 50) {
        this.rpm = 0;
        this.phase = "off";
        this.running = false;
        this.throttle = 0;
      }
    } else if (this.phase === "run") {
      const wobble = Math.sin(performance.now() * 0.007) * 26 + Math.sin(performance.now() * 0.019) * 10;
      const idle = 960 + wobble;
      const target = idle + this.throttle * (8200 - idle);
      const follow = this.throttle > this.rpm / 9000 ? 3.4 : 2.1;
      this.rpm += (target - this.rpm) * Math.min(1, d * follow);
    } else {
      this.rpm = 0;
    }
    this.applyTone();
  }

  dispose() {
    for (const o of this.osc) {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    }
    this.osc = [];
    void this.ctx?.close();
    this.ctx = null;
  }

  private ensure() {
    if (this.ctx || !this.available) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) {
      this.available = false;
      return;
    }
    try {
      const ctx = new AC();
      this.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 10;
      comp.ratio.value = 5;
      comp.attack.value = 0.008;
      comp.release.value = 0.18;
      comp.connect(master);
      master.connect(ctx.destination);
      this.master = master;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 280;
      filter.Q.value = 0.65;
      filter.connect(comp);
      this.filter = filter;

      this.harmonics.forEach((h, i) => {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? "sine" : i < 3 ? "triangle" : "sawtooth";
        const g = ctx.createGain();
        g.gain.value = this.gains[i];
        osc.connect(g);
        g.connect(filter);
        osc.start();
        this.osc.push(osc);
        this.oscGain.push(g);
      });

      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.96 + white * 0.04;
        data[i] = white * 0.6 + last * 4;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 160;
      bp.Q.value = 0.7;
      const ng = ctx.createGain();
      ng.gain.value = 0;
      src.connect(bp);
      bp.connect(ng);
      ng.connect(comp);
      src.start();
      this.noiseFilter = bp;
      this.noiseGain = ng;
    } catch {
      this.available = false;
      this.ctx = null;
    }
  }

  private applyLevel() {
    if (!this.master || !this.ctx) return;
    const audible = this.running && !this.muted && this.available;
    const vol = audible ? 0.16 + this.throttle * 0.1 : 0;
    this.master.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
  }

  private applyTone() {
    this.applyLevel();
    if (!this.ctx || this.osc.length === 0) return;
    const now = this.ctx.currentTime;
    const fundamental = Math.max(8, this.rpm / 18);
    const open = 240 + (this.rpm / 8200) * 2200 + this.throttle * 800;
    this.filter?.frequency.setTargetAtTime(open, now, 0.05);
    this.osc.forEach((osc, i) => {
      osc.frequency.setTargetAtTime(fundamental * this.harmonics[i], now, 0.03);
      const g = this.gains[i] * (this.phase === "off" ? 0 : 0.55 + this.throttle * 0.7);
      this.oscGain[i].gain.setTargetAtTime(g, now, 0.04);
    });
    if (this.noiseGain && this.noiseFilter) {
      const n = this.phase === "off" ? 0 : 0.04 + this.throttle * 0.16 + (this.phase === "crank" ? 0.12 : 0);
      this.noiseGain.gain.setTargetAtTime(n, now, 0.05);
      this.noiseFilter.frequency.setTargetAtTime(120 + this.rpm * 0.05, now, 0.05);
    }
  }
}

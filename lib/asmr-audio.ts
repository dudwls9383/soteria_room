/** Browser-only local audio. Never expand hours of audio into a full PCM buffer. */
export type Ear = "left" | "right";
export type DeckState = { name: string; size: number; duration: number; time: number; playing: boolean; volume: number; a: number; b: number; loop: boolean; loading: boolean; error: boolean };
export const emptyDeck = (): DeckState => ({ name: "", size: 0, duration: 0, time: 0, playing: false, volume: .7, a: 0, b: 0, loop: false, loading: false, error: false });
export function validLoop(a: number, b: number, duration: number) { return Number.isFinite(a + b + duration) && a >= 0 && b <= duration && b - a >= .25; }
export function audioTime(seconds: number, fraction = false) {
  const n = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const clock = `${Math.floor(n / 3600).toString().padStart(2, "0")}:${Math.floor(n / 60 % 60).toString().padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")}`;
  return fraction ? `${clock}.${Math.floor(Math.max(0,Number.isFinite(seconds)?seconds:0) % 1 * 10)}` : clock;
}
/** Mono BEFORE panning: even a stereo file with sound on only one source channel is retained. */
export function connectMonoToSide(context: BaseAudioContext, source: AudioNode, side: Ear, volume = .7) {
  const mono = context.createGain();
  mono.channelCount = 1;
  mono.channelCountMode = "explicit";
  mono.channelInterpretation = "speakers"; // stereo -> 0.5 * (L + R), per Web Audio speaker downmix
  const gain = context.createGain(); gain.gain.value = volume;
  const pan = context.createStereoPanner(); pan.pan.value = side === "left" ? -1 : 1;
  source.connect(mono).connect(gain).connect(pan).connect(context.destination);
  return { mono, gain, pan, disconnect() { source.disconnect(); mono.disconnect(); gain.disconnect(); pan.disconnect(); } };
}
type Resource = { media: HTMLAudioElement; url: string; graph: ReturnType<typeof connectMonoToSide>; state: DeckState; wantsPlayback: boolean; cancel?: () => void };
export class AsmrAudio {
  private context?: AudioContext;
  private decks: Partial<Record<Ear, Resource>> = {};
  private pending: Partial<Record<Ear, Resource>> = {};
  private generation = { left: 0, right: 0 };
  private timer?: ReturnType<typeof setInterval>;
  private disposed = false;
  private changed: (states: Record<Ear, DeckState>) => void;
  constructor(changed: (states: Record<Ear, DeckState>) => void) { this.changed = changed; }
  private getContext() { return this.context ||= new window.AudioContext(); }
  private emit() { if (!this.disposed) this.changed({ left: this.snapshot("left"), right: this.snapshot("right") }); }
  private snapshot(side: Ear) {
    const r = this.decks[side], s = r ? { ...r.state, time: r.media.currentTime, playing: !r.media.paused && !r.media.ended } : emptyDeck();
    s.loading = !!this.pending[side]; return s;
  }
  private release(r?: Resource) {
    if (!r) return;
    r.cancel?.(); r.media.pause(); r.graph.disconnect(); r.media.removeAttribute("src"); r.media.load(); URL.revokeObjectURL(r.url);
  }
  async load(side: Ear, file: File) {
    const version = ++this.generation[side];
    this.release(this.pending[side]);
    const context = this.getContext(), media = new Audio();
    media.preload = "metadata";
    const url = URL.createObjectURL(file), source = context.createMediaElementSource(media);
    const state = { ...emptyDeck(), name: file.name, size: file.size, volume: this.decks[side]?.state.volume ?? .7 };
    const r: Resource = { media, url, state, wantsPlayback: false, graph: connectMonoToSide(context, source, side, state.volume) };
    this.pending[side] = r; this.emit();
    try {
      await new Promise<void>((resolve, reject) => {
        const clean = () => { clearTimeout(timeout); media.removeEventListener("loadedmetadata", loaded); media.removeEventListener("error", failed); r.cancel = undefined; };
        const loaded = () => { clean(); Number.isFinite(media.duration) && media.duration > 0 ? resolve() : reject(new Error("unsupported")); };
        const failed = () => { clean(); reject(new Error("unsupported")); };
        const timeout = setTimeout(failed, 30000);
        r.cancel = () => { clean(); reject(new Error("cancelled")); };
        media.addEventListener("loadedmetadata", loaded); media.addEventListener("error", failed);
        media.src = url; media.load();
      });
      if (this.disposed || version !== this.generation[side]) return false;
      // Candidate is ready before the old file is stopped; the opposite ear is untouched.
      this.release(this.decks[side]); this.decks[side] = r; delete this.pending[side];
      state.duration = media.duration; state.b = media.duration;
      for (const event of ["timeupdate", "play", "pause", "ended", "error"]) media.addEventListener(event, () => {
        if (this.decks[side] !== r) return;
        if (event === "error") { state.error = true; r.wantsPlayback = false; media.pause(); }
        this.checkLoop(r); this.emit();
      });
      this.emit(); return true; // Replacement starts paused at 0, never surprises the listener.
    } catch (error) {
      if (version !== this.generation[side] || this.disposed) return false;
      delete this.pending[side]; this.release(r); this.emit(); throw error;
    }
  }
  private checkLoop(r: Resource) {
    if (r.wantsPlayback && r.state.loop && (r.media.currentTime >= r.state.b || r.media.ended)) {
      r.media.currentTime = r.state.a;
      if (r.media.ended || r.media.paused) void r.media.play().catch(() => { r.state.error = true; this.emit(); });
    }
  }
  async play(sides: Ear[]) {
    const context = this.getContext(); await context.resume();
    // Start requests together. Separate media streams are not sample-accurate synchronization.
    const results = await Promise.allSettled(sides.map(side => {
      const r = this.decks[side]; if (!r) return Promise.resolve();
      r.state.error = false; r.wantsPlayback = true;
      if (r.state.loop && (r.media.currentTime < r.state.a || r.media.currentTime >= r.state.b)) r.media.currentTime = r.state.a;
      else if (r.media.ended) r.media.currentTime = 0;
      return r.media.play();
    }));
    if (!this.timer) this.timer = setInterval(() => {
      for (const r of Object.values(this.decks)) if (!r.media.paused || r.media.ended) this.checkLoop(r);
      if (Object.values(this.decks).every(r => r.media.paused)) { clearInterval(this.timer); this.timer = undefined; }
      this.emit();
    }, 100);
    this.emit(); if (results.some(r => r.status === "rejected")) throw new Error("playback");
  }
  pause(sides: Ear[]) { for (const side of sides) { const r = this.decks[side]; if (r) { r.wantsPlayback = false; r.media.pause(); } } this.emit(); }
  seek(side: Ear, time: number) { const r = this.decks[side]; if (r) { r.media.currentTime = Math.max(0, Math.min(r.state.duration, time)); this.emit(); } }
  volume(side: Ear, value: number) { const r = this.decks[side]; if (r) { r.state.volume = Math.max(0, Math.min(1, value)); r.graph.gain.gain.setTargetAtTime(r.state.volume, this.getContext().currentTime, .02); this.emit(); } }
  loop(side: Ear, patch: Partial<Pick<DeckState, "a" | "b" | "loop">>) {
    const r = this.decks[side]; if (!r) return;
    Object.assign(r.state, patch);
    if (!validLoop(r.state.a, r.state.b, r.state.duration)) r.state.loop = false;
    this.emit();
  }
  dispose() {
    this.disposed = true; ++this.generation.left; ++this.generation.right;
    clearInterval(this.timer); for (const r of [...Object.values(this.decks), ...Object.values(this.pending)]) this.release(r);
    this.decks = {}; this.pending = {}; void this.context?.close().catch(() => {});
  }
}

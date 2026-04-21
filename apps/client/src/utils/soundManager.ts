class SoundManager {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    this.initCtx();
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx!.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx!.destination);

    osc.start();
    osc.stop(this.ctx!.currentTime + duration);
  }

  // Satisfying C Major chord for success
  public playSuccess() {
    [523.25, 659.25, 783.99].forEach(f => this.playTone(f, 'sine', 0.5, 0.05));
  }

  // Soft tick for timer
  public playTick() {
    this.playTone(880, 'sine', 0.1, 0.02);
  }

  // Two-tone alert for new round/notification
  public playNotification() {
    this.playTone(440, 'sine', 0.1, 0.05);
    setTimeout(() => this.playTone(880, 'sine', 0.2, 0.05), 100);
  }

  // Triumphant sequence for game over
  public playFanfare() {
    const tones = [523.25, 659.25, 783.99, 1046.50];
    tones.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.4, 0.05), i * 150);
    });
  }
}

export const soundManager = new SoundManager();

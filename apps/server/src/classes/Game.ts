import { Room } from './Room.js';
import { Player } from './Player.js';
import { getWordOptions } from '../utils/words.js';

export class Game {
  public round: number = 0;
  public currentWord: string = '';
  public currentDrawer: Player | null = null;
  
  private timeLeft: number = 0;
  private timer: NodeJS.Timeout | null = null;
  private hintTimer: NodeJS.Timeout | null = null;
  private correctGuessers: number = 0;

  private playersOrder: string[] = [];
  private currentDrawerIndex: number = -1;

  constructor(private room: Room) {}

  public reset() {
    this.round = 0;
    this.currentWord = '';
    this.currentDrawer = null;
    this.timeLeft = 0;
    this.correctGuessers = 0;
    this.playersOrder = [];
    this.currentDrawerIndex = -1;
    if (this.timer) clearInterval(this.timer);
    if (this.hintTimer) clearInterval(this.hintTimer);
    
    // Also reset all player scores
    this.room.players.forEach(player => {
        player.score = 0;
    });
  }

  public startRound() {
    // If we finished a cycle of all players, or it's the very first round
    if (this.currentDrawerIndex === -1 || this.currentDrawerIndex >= this.playersOrder.length - 1) {
        this.playersOrder = Array.from(this.room.players.keys());
        this.currentDrawerIndex = -1;
        this.round++;
    }

    if (this.round > this.room.settings.totalRounds) {
        this.endGame();
        return;
    }

    this.currentDrawerIndex++;
    const drawerId = this.playersOrder[this.currentDrawerIndex];
    const currentPlayer = this.room.players.get(drawerId);

    if (!currentPlayer || !currentPlayer.isConnected) {
        // Player left or disconnected, skip to next
        // If we've tried everyone in this order, we might need to increment round or stop
        if (this.currentDrawerIndex >= this.playersOrder.length - 1) {
            // End of this cycle
            this.startRound();
        } else {
            this.startRound();
        }
        return;
    }

    this.currentDrawer = currentPlayer;
    this.currentDrawer.isDrawing = true;
    this.correctGuessers = 0;
    
    const options = getWordOptions(3);
    
    this.room.broadcast('waiting_for_word', {
      drawerId: this.currentDrawer.id,
      drawerName: this.currentDrawer.name,
      round: this.round
    });

    this.room.broadcastToPlayer(this.currentDrawer.id, 'word_options', options);
    
    if (this.timer) clearInterval(this.timer);
    this.timeLeft = 15;
    this.timer = setInterval(() => {
        this.timeLeft--;
        this.room.broadcast('timer_update', this.timeLeft);
        if (this.timeLeft <= 0) {
            this.selectWord(options[0]);
        }
    }, 1000);
  }

  public selectWord(word: string) {
    if (this.timer) clearInterval(this.timer);
    
    this.currentWord = word;
    this.timeLeft = this.room.settings.drawTime;

    this.room.broadcast('round_start', {
      drawerId: this.currentDrawer?.id,
      round: this.round,
      time: this.room.settings.drawTime,
      hint: this.currentWord.replace(/[a-zA-Z]/g, '_ ')
    });

    this.startTimers();
  }

  private startTimers() {
    if (this.timer) clearInterval(this.timer);
    if (this.hintTimer) clearInterval(this.hintTimer);

    this.timer = setInterval(() => {
      this.timeLeft--;
      this.room.broadcast('timer_update', this.timeLeft);
      if (this.timeLeft <= 0) {
        this.endRound();
      }
    }, 1000);

    const revealedIndices = new Set<number>();
    const hintInterval = (this.room.settings.drawTime * 1000) / (this.currentWord.length + 1);

    this.hintTimer = setInterval(() => {
      let unshown = Array.from(Array(this.currentWord.length).keys())
                         .filter(i => !revealedIndices.has(i) && this.currentWord[i] !== ' ');
      
      if (unshown.length > 0) {
        const randomIndex = unshown[Math.floor(Math.random() * unshown.length)];
        revealedIndices.add(randomIndex);
        
        const hintString = this.currentWord.split('').map((char, i) => 
          revealedIndices.has(i) || char === ' ' ? char : '_'
        ).join(' ');

        this.room.broadcast('hint', { hint: hintString });
      }
    }, hintInterval);
  }

  public checkGuess(player: Player, guess: string): boolean {
    if (guess.toLowerCase().trim() === this.currentWord.toLowerCase()) {
      this.correctGuessers++;
      const points = this.calculateScore(this.timeLeft, this.correctGuessers);
      player.addScore(points);
      
      if (this.currentDrawer) {
        this.currentDrawer.addScore(Math.round(points * 0.5));
      }
      return true;
    }
    return false;
  }

  private calculateScore(timeLeft: number, position: number): number {
    const base = 500;
    const timeFactor = timeLeft / this.room.settings.drawTime;
    return Math.round(base * timeFactor * Math.max(0.1, (1 - (position - 1) * 0.1)));
  }

  public endRound() {
    if (this.timer) clearInterval(this.timer);
    if (this.hintTimer) clearInterval(this.hintTimer);
    
    if (this.currentDrawer) this.currentDrawer.isDrawing = false;
    
    this.room.broadcast('round_end', {
      word: this.currentWord,
      scores: Array.from(this.room.players.values()).map(p => ({ id: p.id, score: p.score }))
    });

    // Start next round after 5 seconds
    setTimeout(() => {
        this.startRound();
    }, 5000);
  }

  private endGame() {
      this.room.broadcast('game_over', {
          leaderboard: Array.from(this.room.players.values())
                            .sort((a,b) => b.score - a.score)
                            .map(p => p.toJSON())
      });
  }
}

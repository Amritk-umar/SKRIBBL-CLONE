import { Room } from './Room.js';
import { Player } from './Player.js';
import { getWordOptions } from '../utils/words.js';

export class Game {
  public round: number = 0;
  public currentWord: string = '';
  public currentDrawer: Player | null = null;
  public isRoundActive: boolean = false;
  
  private timeLeft: number = 0;
  private timer: NodeJS.Timeout | null = null;
  private hintTimer: NodeJS.Timeout | null = null;
  private nextRoundTimeout: NodeJS.Timeout | null = null;
  private correctGuessers: number = 0;
  private validOptions: string[] = [];

  private playersOrder: string[] = [];
  private currentDrawerIndex: number = -1;

  constructor(private room: Room) {}

  public getTimeLeft() {
    return this.timeLeft;
  }

  public reset() {
    this.round = 0;
    this.currentWord = '';
    this.currentDrawer = null;
    this.isRoundActive = false;
    this.timeLeft = 0;
    this.correctGuessers = 0;
    this.playersOrder = [];
    this.currentDrawerIndex = -1;
    this.validOptions = [];
    this.room.drawHistory = []; // Clear drawing history on reset
    if (this.timer) clearInterval(this.timer);
    if (this.hintTimer) clearInterval(this.hintTimer);
    if (this.nextRoundTimeout) clearTimeout(this.nextRoundTimeout);
    
    // Also reset all player scores
    this.room.players.forEach(player => {
        player.score = 0;
    });
  }

  public startRound() {
    if (this.nextRoundTimeout) clearTimeout(this.nextRoundTimeout);
    
    // Explicitly reset per-round flags
    this.currentWord = '';
    this.isRoundActive = false;

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

    // Find next connected player using a loop instead of recursion to prevent stack overflow
    let found = false;
    while (this.currentDrawerIndex < this.playersOrder.length - 1) {
        this.currentDrawerIndex++;
        const drawerId = this.playersOrder[this.currentDrawerIndex];
        const currentPlayer = this.room.players.get(drawerId);
        
        if (currentPlayer && currentPlayer.isConnected) {
            this.currentDrawer = currentPlayer;
            found = true;
            break;
        }
    }

    if (!found) {
        // If we reached the end of the order without finding a connected player
        // Check if there are ANY connected players left in the room
        const anyConnected = Array.from(this.room.players.values()).some(p => p.isConnected);
        if (anyConnected) {
            // Reset index and try next round cycle
            this.currentDrawerIndex = -1;
            this.startRound(); 
            // Note: If all players are disconnected, this would still recurse, 
            // but the 'anyConnected' check prevents it.
        } else {
            this.reset();
            this.room.broadcast('room_state', this.room.getRoomData());
        }
        return;
    }

    this.currentDrawer!.isDrawing = true;
    this.correctGuessers = 0;
    this.room.drawHistory = []; // Clear canvas history for new round
    
    // Custom Words Logic
    let pool = getWordOptions(10); // Default pool
    if (this.room.settings.customWords && this.room.settings.customWords.length > 0) {
        // Mix custom words with default pool (50/50 chance or priority)
        const customPool = this.room.settings.customWords.sort(() => 0.5 - Math.random());
        pool = [...customPool.slice(0, 5), ...pool.slice(0, 5)].sort(() => 0.5 - Math.random());
    }
    
    this.validOptions = pool.slice(0, 3);
    
    this.room.broadcast('waiting_for_word', {
      drawerId: this.currentDrawer!.id,
      drawerName: this.currentDrawer!.name,
      round: this.round
    });

    this.room.broadcastToPlayer(this.currentDrawer!.id, 'word_options', this.validOptions);
    
    if (this.timer) clearInterval(this.timer);
    this.timeLeft = 15;
    this.timer = setInterval(() => {
        this.timeLeft--;
        this.room.broadcast('timer_update', this.timeLeft);
        if (this.timeLeft <= 0) {
            this.selectWord(this.validOptions[0]);
        }
    }, 1000);
  }

  public selectWord(word: string) {
    if (this.timer) clearInterval(this.timer);
    
    // Validation: ensure word was an option
    if (!this.validOptions.includes(word)) {
        word = this.validOptions[0];
    }

    this.currentWord = word;
    this.timeLeft = this.room.settings.drawTime;
    this.isRoundActive = true;

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
    // Security Fix: Drawer cannot guess their own word
    if (player.id === this.currentDrawer?.id) return false;

    if (guess.toLowerCase().trim() === this.currentWord.toLowerCase()) {
      this.correctGuessers++;
      const points = this.calculateScore(this.timeLeft, this.correctGuessers);
      player.addScore(points);
      
      if (this.currentDrawer) {
        this.currentDrawer.addScore(Math.round(points * 0.5));
      }

      // If everyone except the drawer has guessed, end the round early
      const activePlayers = Array.from(this.room.players.values()).filter(p => p.isConnected);
      if (this.correctGuessers >= activePlayers.length - 1) {
          this.endRound();
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
    if (this.nextRoundTimeout) clearTimeout(this.nextRoundTimeout);
    
    if (this.currentDrawer) this.currentDrawer.isDrawing = false;
    this.isRoundActive = false;
    
    this.room.broadcast('round_end', {
      word: this.currentWord,
      scores: Array.from(this.room.players.values()).map(p => ({ id: p.id, score: p.score }))
    });

    // Start next round after 5 seconds, store timeout to prevent memory leak
    this.nextRoundTimeout = setTimeout(() => {
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

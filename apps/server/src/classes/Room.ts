import { Server, Socket } from 'socket.io';
import { Player } from './Player.js';
import { Game } from './Game.js';

export interface RoomSettings {
    totalRounds: number;
    drawTime: number;
    aspectRatio: '16:9' | '4:3' | '1:1';
    customWords: string[];
}

export class Room {
  public players: Map<string, Player> = new Map(); // Key is playerId
  private socketToPlayerId: Map<string, string> = new Map();
  public game: Game;
  public drawHistory: any[] = [];
  public settings: RoomSettings = {
      totalRounds: 3,
      drawTime: 80,
      aspectRatio: '16:9',
      customWords: []
  };

  constructor(
    public readonly id: string,
    private io: Server
  ) {
    this.game = new Game(this);
  }

  public updateSettings(settings: Partial<RoomSettings>) {
      this.settings = { ...this.settings, ...settings };
      this.broadcast('room_state', this.getRoomData());
  }

  public addPlayer(socket: Socket, name: string, playerId: string) {
    let player = this.players.get(playerId);
    
    if (player) {
        // Reconnection logic
        player.isConnected = true;
        player.socketId = socket.id;
    } else {
        // New player
        player = new Player(socket.id, name, playerId);
        this.players.set(playerId, player);
    }

    this.socketToPlayerId.set(socket.id, playerId);
    socket.join(this.id);
    this.broadcast('room_state', this.getRoomData());
    
    // Also send current drawing history to the joining player
    if (this.drawHistory.length > 0) {
      this.broadcastToPlayer(socket.id, 'canvas_state', this.drawHistory);
    }
  }

  public removePlayer(socketId: string): number {
    const playerId = this.socketToPlayerId.get(socketId);
    if (playerId) {
        const player = this.players.get(playerId);
        if (player) {
            player.isConnected = false;
        }
        this.socketToPlayerId.delete(socketId);
        this.broadcast('room_state', this.getRoomData());
    }
    
    // Count only connected players
    return Array.from(this.players.values()).filter(p => p.isConnected).length;
  }

  public getHost(): Player | null {
      // Host is the first CONNECTED player in the map
      return Array.from(this.players.values()).find(p => p.isConnected) || null;
  }

  public broadcast(event: string, data: any) {
    this.io.to(this.id).emit(event, data);
  }

  public broadcastToPlayer(playerId: string, event: string, data: any) {
    this.io.to(playerId).emit(event, data);
  }

  public getRoomData() {
    let phase = 'lobby';
    if (this.game.round > 0) {
        if (!this.game.currentWord) {
            phase = 'selecting';
        } else if (this.game.isRoundActive) {
            phase = 'playing';
        } else {
            phase = 'selecting'; // Transitioning to next round
        }
    }
    
    return {
      id: this.id,
      players: Array.from(this.players.values()).map(p => p.toJSON()),
      settings: this.settings,
      phase: phase,
      currentRound: this.game.round,
      currentDrawer: this.game.currentDrawer?.id,
      timeLeft: this.game.getTimeLeft(),
      initialTime: phase === 'playing' ? this.settings.drawTime : 15,
      hostId: this.getHost()?.id
    };
  }
}

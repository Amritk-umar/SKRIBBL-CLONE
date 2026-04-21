import { Server, Socket } from 'socket.io';
import { Player } from './Player.js';
import { Game } from './Game.js';

export interface RoomSettings {
    totalRounds: number;
    drawTime: number;
}

export class Room {
  public players: Map<string, Player> = new Map();
  public game: Game;
  public settings: RoomSettings = {
      totalRounds: 3,
      drawTime: 80
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

  public addPlayer(socket: Socket, name: string) {
    const player = new Player(socket.id, name);
    this.players.set(socket.id, player);
    socket.join(this.id);
    this.broadcast('room_state', this.getRoomData());
  }

  public removePlayer(socketId: string) {
    this.players.delete(socketId);
    this.broadcast('player_left', socketId);
  }

  public broadcast(event: string, data: any) {
    this.io.to(this.id).emit(event, data);
  }

  public broadcastToPlayer(playerId: string, event: string, data: any) {
    this.io.to(playerId).emit(event, data);
  }

  public getRoomData() {
    return {
      id: this.id,
      players: Array.from(this.players.values()).map(p => p.toJSON()),
      settings: this.settings
    };
  }
}

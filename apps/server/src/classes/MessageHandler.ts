import { Server, Socket } from 'socket.io';
import { Room } from './Room.js';

export class MessageHandler {
  private rooms: Map<string, Room> = new Map();

  constructor(private io: Server) {}

  public handle(socket: Socket) {
    socket.on('join_room', ({ roomId, name }) => {
      let room = this.rooms.get(roomId);
      if (!room) {
        room = new Room(roomId, this.io);
        this.rooms.set(roomId, room);
      }
      room.addPlayer(socket, name);
    });

    socket.on('start_game', () => {
        const roomId = this.getSocketRoomId(socket);
        if (roomId) {
            const room = this.rooms.get(roomId);
            const player = room?.players.get(socket.id);
            if (room && player) {
                // Host is the first player in the map
                const hostId = Array.from(room.players.keys())[0];
                if (socket.id !== hostId) {
                    socket.emit('chat_message', {
                        id: Date.now().toString(),
                        playerId: 'system',
                        playerName: 'System',
                        text: 'Only the host can start the game.',
                        isSystem: true
                    });
                    return;
                }
                
                if (room.players.size < 2) {
                    socket.emit('chat_message', {
                        id: Date.now().toString(),
                        playerId: 'system',
                        playerName: 'System',
                        text: 'At least 2 players are required to start the game.',
                        isSystem: true
                    });
                    return;
                }
                room.game.reset(); // Reset rounds, scores, and state
                room.broadcast('room_state', room.getRoomData()); // Explicitly sync the 'lobby' phase
                room.game.startRound();
            }
        }
    });

    socket.on('update_settings', (settings) => {
        const roomId = this.getSocketRoomId(socket);
        if (roomId) {
            const room = this.rooms.get(roomId);
            if (room) {
                room.updateSettings(settings);
            }
        }
    });

    socket.on('choose_word', (word: string) => {
        const roomId = this.getSocketRoomId(socket);
        const room = roomId ? this.rooms.get(roomId) : null;
        if (room && room.game.currentDrawer?.id === socket.id) {
            room.game.selectWord(word);
        }
    });

    socket.on('guess', (text: string) => {
        const roomId = this.getSocketRoomId(socket);
        const room = roomId ? this.rooms.get(roomId) : null;
        const player = room?.players.get(socket.id);
        
        if (room && player) {
            const correct = room.game.checkGuess(player, text);
            if (correct) {
                room.broadcast('guess_result', { 
                    correct: true, 
                    playerId: player.id, 
                    points: player.score 
                });
                room.broadcast('chat_message', {
                    id: Date.now().toString(),
                    playerId: 'system',
                    playerName: 'System',
                    text: `${player.name} guessed the word!`,
                    isSystem: true
                });
            } else {
                room.broadcast('chat_message', {
                    id: Date.now().toString(),
                    playerId: player.id,
                    playerName: player.name,
                    text: text
                });
            }
        }
    });

    // Drawing Relay
    socket.on('draw_event', (data) => {
      const roomId = this.getSocketRoomId(socket);
      if (roomId) {
        socket.to(roomId).emit('draw_data', data);
      }
    });

    socket.on('draw_undo', () => {
        const roomId = this.getSocketRoomId(socket);
        if (roomId) socket.to(roomId).emit('draw_undo');
    });

    socket.on('canvas_clear', () => {
        const roomId = this.getSocketRoomId(socket);
        if (roomId) socket.to(roomId).emit('canvas_clear');
    });

    socket.on('disconnecting', () => {
      socket.rooms.forEach(roomId => {
        const room = this.rooms.get(roomId);
        if (room) {
            room.removePlayer(socket.id);
            if (room.players.size === 0) {
                this.rooms.delete(roomId);
            }
        }
      });
    });
  }

  private getSocketRoomId(socket: Socket): string | null {
      const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
      return rooms.length > 0 ? rooms[0] : null;
  }
}

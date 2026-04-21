import { Server, Socket } from 'socket.io';
import { Room } from './Room.js';
import { isClose } from '../utils/stringUtils.js';

export class MessageHandler {
  private rooms: Map<string, Room> = new Map();
  private lastGuessTime: Map<string, number> = new Map();
  private lastDrawTime: Map<string, number> = new Map();

  constructor(private io: Server) {}

  public handle(socket: Socket) {
    socket.on('join_room', ({ roomId, name, playerId }) => {
      let room = this.rooms.get(roomId);
      if (!room) {
        room = new Room(roomId, this.io);
        this.rooms.set(roomId, room);
      }
      room.addPlayer(socket, name, playerId);
    });

    socket.on('start_game', () => {
        const roomId = this.getSocketRoomId(socket);
        if (roomId) {
            const room = this.rooms.get(roomId);
            const host = room?.getHost();
            const player = Array.from(room?.players.values() || []).find(p => p.socketId === socket.id);
            
            if (room && player) {
                if (player.id !== host?.id) {
                    socket.emit('chat_message', {
                        id: Date.now().toString(),
                        playerId: 'system',
                        playerName: 'System',
                        text: 'Only the host can start the game.',
                        isSystem: true
                    });
                    return;
                }
                
                const connectedCount = Array.from(room.players.values()).filter(p => p.isConnected).length;
                if (connectedCount < 2) {
                    socket.emit('chat_message', {
                        id: Date.now().toString(),
                        playerId: 'system',
                        playerName: 'System',
                        text: 'At least 2 connected players are required to start.',
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
                // Security Fix: Only host can update settings
                const host = room.getHost();
                const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
                if (!player || player.id !== host?.id) return;

                // Validation Fix: Ensure reasonable values
                const validated: any = {};
                if (typeof settings.totalRounds === 'number') {
                    validated.totalRounds = Math.max(1, Math.min(10, settings.totalRounds));
                }
                if (typeof settings.drawTime === 'number') {
                    validated.drawTime = Math.max(30, Math.min(180, settings.drawTime));
                }
                if (['16:9', '4:3', '1:1'].includes(settings.aspectRatio)) {
                    validated.aspectRatio = settings.aspectRatio;
                }
                if (Array.isArray(settings.customWords)) {
                    validated.customWords = settings.customWords
                        .filter((w: any) => typeof w === 'string')
                        .map((w: string) => w.trim())
                        .filter((w: string) => w.length > 0 && w.length < 30)
                        .slice(0, 100); // Limit to 100 custom words
                }

                if (Object.keys(validated).length > 0) {
                    room.updateSettings(validated);
                }
            }
        }
    });

    socket.on('choose_word', (word: string) => {
        const roomId = this.getSocketRoomId(socket);
        const room = roomId ? this.rooms.get(roomId) : null;
        const player = Array.from(room?.players.values() || []).find(p => p.socketId === socket.id);
        if (room && player && room.game.currentDrawer?.id === player.id) {
            room.game.selectWord(word);
        }
    });

    socket.on('guess', (text: string) => {
        const roomId = this.getSocketRoomId(socket);
        const room = roomId ? this.rooms.get(roomId) : null;
        const player = Array.from(room?.players.values() || []).find(p => p.socketId === socket.id);
        
        if (room && player) {
            // Rate Limiting Fix: prevent guess spam
            const now = Date.now();
            const lastTime = this.lastGuessTime.get(socket.id) || 0;
            if (now - lastTime < 400) return; // 400ms cooldown
            this.lastGuessTime.set(socket.id, now);

            // Validation: Max length
            if (typeof text !== 'string' || text.length > 50) return;

            // Security: Drawer cannot reveal word in chat
            if (player.id === room.game.currentDrawer?.id && text.toLowerCase().trim() === room.game.currentWord.toLowerCase()) {
                socket.emit('chat_message', {
                    id: Date.now().toString(),
                    playerId: 'system',
                    playerName: 'System',
                    text: 'You cannot type the word in chat!',
                    isSystem: true
                });
                return;
            }

            // Only allow correct guesses during active round
            const correct = room.game.isRoundActive ? room.game.checkGuess(player, text) : false;
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
                if (isClose(text, room.game.currentWord)) {
                    socket.emit('chat_message', {
                        id: Date.now().toString(),
                        playerId: 'system',
                        playerName: 'System',
                        text: `'${text}' is close!`,
                        isSystem: true
                    });
                }
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
        const room = this.rooms.get(roomId);
        if (room) {
            // Rate limiting drawing events (max 100 per second)
            const now = Date.now();
            const lastTime = this.lastDrawTime.get(socket.id) || 0;
            if (now - lastTime < 10) return; 
            this.lastDrawTime.set(socket.id, now);

            room.drawHistory.push({ type: 'draw', data });
            socket.to(roomId).emit('draw_data', data);
        }
      }
    });

    socket.on('draw_fill', (data) => {
        const roomId = this.getSocketRoomId(socket);
        if (roomId) {
          const room = this.rooms.get(roomId);
          if (room) {
              room.drawHistory.push({ type: 'fill', data });
              socket.to(roomId).emit('draw_fill', data);
          }
        }
    });

    socket.on('draw_undo', () => {
        const roomId = this.getSocketRoomId(socket);
        if (roomId) {
            const room = this.rooms.get(roomId);
            if (room && room.drawHistory.length > 0) {
                const lastAction = room.drawHistory[room.drawHistory.length - 1];
                
                if (lastAction.type === 'fill') {
                    // Just remove the single fill action
                    room.drawHistory.pop();
                } else if (lastAction.type === 'draw') {
                    // Find the start of the last continuous stroke (until the previous 'end' or start of history)
                    let lastEndIndex = -1;
                    for (let i = room.drawHistory.length - 1; i >= 0; i--) {
                        if (room.drawHistory[i].type === 'draw' && room.drawHistory[i].data.end) {
                            lastEndIndex = i;
                            break;
                        }
                    }
                    
                    if (lastEndIndex !== -1) {
                        let startIndex = 0;
                        for (let i = lastEndIndex - 1; i >= 0; i--) {
                            if (room.drawHistory[i].type === 'draw' && room.drawHistory[i].data.end) {
                                startIndex = i + 1;
                                break;
                            } else if (room.drawHistory[i].type === 'fill') {
                                startIndex = i + 1;
                                break;
                            }
                        }
                        room.drawHistory.splice(startIndex, lastEndIndex - startIndex + 1);
                    } else {
                        // Handle case where there's only one stroke and it didn't "end" yet (unlikely but safe)
                        room.drawHistory = room.drawHistory.filter(h => h.type !== 'draw');
                    }
                }
                socket.to(roomId).emit('draw_undo');
            }
        }
    });

    socket.on('canvas_clear', () => {
        const roomId = this.getSocketRoomId(socket);
        if (roomId) {
            const room = this.rooms.get(roomId);
            if (room) {
                room.drawHistory = [];
                socket.to(roomId).emit('canvas_clear');
            }
        }
    });

    socket.on('disconnecting', () => {
      socket.rooms.forEach(roomId => {
        const room = this.rooms.get(roomId);
        if (room) {
            const connectedCount = room.removePlayer(socket.id);
            if (connectedCount === 0) {
                this.rooms.delete(roomId);
            }
        }
      });
      this.lastGuessTime.delete(socket.id);
      this.lastDrawTime.delete(socket.id);
    });
  }

  private getSocketRoomId(socket: Socket): string | null {
      const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
      return rooms.length > 0 ? rooms[0] : null;
  }
}

export class Player {
  public score: number = 0;
  public isDrawing: boolean = false;
  public isConnected: boolean = true;

  constructor(
    public socketId: string,
    public name: string,
    public readonly id: string // Persistent playerId
  ) {}

  public addScore(points: number) {
    this.score += points;
  }

  public toJSON() {
    return {
      id: this.id, // Return persistent ID to client
      name: this.name,
      score: this.score,
      isDrawing: this.isDrawing,
      isConnected: this.isConnected
    };
  }
}

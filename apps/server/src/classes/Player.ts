export class Player {
  public score: number = 0;
  public isDrawing: boolean = false;
  public isConnected: boolean = true;

  constructor(
    public readonly id: string,
    public name: string
  ) {}

  public addScore(points: number) {
    this.score += points;
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      score: this.score,
      isDrawing: this.isDrawing,
      isConnected: this.isConnected
    };
  }
}

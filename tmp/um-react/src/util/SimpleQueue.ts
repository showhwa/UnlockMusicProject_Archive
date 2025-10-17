export class SimpleQueue {
  private queue: (() => void)[] = [];
  private running = 0;

  constructor(private concurrency: number) {}

  async enter() {
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
      setTimeout(this.next);
    });
  }

  leave() {
    this.running--;
    setTimeout(this.next);
  }

  private next = () => {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const fn = this.queue.shift();
      if (fn) {
        this.running++;
        setTimeout(fn);
      }
    }
  };
}

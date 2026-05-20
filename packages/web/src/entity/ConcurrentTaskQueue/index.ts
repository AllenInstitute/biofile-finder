/**
 * Class entity for managing a queue of concurrent async tasks
 */
export default class ConcurrentTaskQueue {
    private readonly queue: Array<() => void> = [];
    private readonly tasks: Promise<void>[] = [];
    private maxParallelTasks: number;
    private activeTaskCount = 0;
    private isCancelled = false;

    constructor(maxParallelTasks: number) {
        this.maxParallelTasks = maxParallelTasks;
    }

    public get length(): number {
        return this.queue.length;
    }

    public async push<T>(task: (...args: any[]) => Promise<T>) {
        this.tasks.push(this.run<T>(task));
    }

    public async drain() {
        await Promise.all(this.tasks);
    }

    public async cancel() {
        this.isCancelled = true;
        // Resolve all waiting tasks in the queue immediately
        // the tasks don't actually end up running thanks to the
        // isCancelled check in run(), but this ensures that any
        // pending pushes are unblocked and can resolve properly
        while (this.queue.length) {
            this.queue.shift()?.();
        }
        await Promise.allSettled(this.tasks);
    }

    private async run<T>(task: (...args: any[]) => Promise<T>): Promise<void> {
        if (this.isCancelled) {
            return;
        }

        // If at concurrency limit, add to queue
        if (this.activeTaskCount >= this.maxParallelTasks) {
            await new Promise<void>((resolve) => this.queue.push(resolve));
            if (this.isCancelled) {
                return;
            }
        }

        // Otherwise run task now
        this.activeTaskCount++;
        try {
            await task();
        } finally {
            // After finishing task run next in queue
            this.activeTaskCount--;
            if (this.queue.length && !this.isCancelled) this.queue.shift()?.();
        }
    }
}

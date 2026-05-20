import { expect } from "chai";
import { noop } from "lodash";

import ConcurrentTaskQueue from "..";

describe("ConcurrentTaskQueue", () => {
    type Deferred = {
        promise: Promise<void>;
        resolve: () => void;
    };

    function createDeferred(): Deferred {
        let resolve = noop;
        const promise = new Promise<void>((resolveFn) => {
            resolve = resolveFn;
        });
        return {
            promise,
            resolve,
        };
    }

    describe("push and drain", () => {
        it("queues tasks beyond max parallel limit", async () => {
            const queue = new ConcurrentTaskQueue(2);
            const firstTask = createDeferred();
            const secondTask = createDeferred();

            await queue.push(async () => firstTask.promise);
            await queue.push(async () => secondTask.promise);
            await queue.push(async () => Promise.resolve());

            expect(queue.length).to.equal(1);

            firstTask.resolve();
            secondTask.resolve();
            await queue.drain();
            expect(queue.length).to.equal(0);
        });

        it("never runs more than maxParallelTasks at once", async () => {
            const queue = new ConcurrentTaskQueue(2);
            const blockers = [
                createDeferred(),
                createDeferred(),
                createDeferred(),
                createDeferred(),
            ];
            let activeTasks = 0;
            let maxActiveTasks = 0;

            blockers.forEach((blocker) => {
                void queue.push(async () => {
                    activeTasks++;
                    maxActiveTasks = Math.max(maxActiveTasks, activeTasks);
                    await blocker.promise;
                    activeTasks--;
                });
            });

            await Promise.resolve();
            expect(maxActiveTasks).to.equal(2);
            expect(queue.length).to.equal(2);

            blockers.forEach((blocker) => blocker.resolve());
            await queue.drain();
            expect(activeTasks).to.equal(0);
        });

        it("drain resolves only after all tasks complete", async () => {
            const queue = new ConcurrentTaskQueue(1);
            const task = createDeferred();
            let drained = false;

            await queue.push(async () => task.promise);
            const drainPromise = queue.drain().then(() => {
                drained = true;
            });

            await Promise.resolve();
            expect(drained).to.equal(false);

            task.resolve();
            await drainPromise;
            expect(drained).to.equal(true);
        });
    });

    describe("cancel", () => {
        it("resolves when active tasks settle", async () => {
            const queue = new ConcurrentTaskQueue(2);
            const firstTask = createDeferred();
            const secondTask = createDeferred();
            let completedTasks = 0;

            await queue.push(async () => {
                await firstTask.promise;
                completedTasks++;
            });

            await queue.push(async () => {
                await secondTask.promise;
                completedTasks++;
            });

            const cancelPromise = queue.cancel();
            firstTask.resolve();
            secondTask.resolve();

            await cancelPromise;
            expect(completedTasks).to.equal(2);
        });

        it("resolves without starting queued tasks", async () => {
            const queue = new ConcurrentTaskQueue(1);
            const activeTask = createDeferred();
            let queuedTaskStarted = false;

            await queue.push(async () => activeTask.promise);
            await queue.push(async () => {
                queuedTaskStarted = true;
            });

            const cancelPromise = queue.cancel();

            activeTask.resolve();
            await cancelPromise;

            expect(queuedTaskStarted).to.equal(false);
        });
    });
});

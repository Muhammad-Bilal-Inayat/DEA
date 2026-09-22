/**
 * MBI Inventra - Sequential Synchronization Queue with Mutex Lock Pattern
 * Ensures that initial page load data fetches, background autosaves, and periodic
 * sync operations execute sequentially without race conditions or IndexedDB collisions.
 */

type SyncTask<T = any> = () => Promise<T>;

export class SyncMutexQueue {
  private queue: Array<{
    task: SyncTask;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    label: string;
  }> = [];
  private locked = false;
  private activeTaskLabel: string | null = null;

  /**
   * Enqueues a sync task. If the queue is busy, tasks execute in strict sequential order.
   * Prevents race conditions between initial page load fetches and background autosaves.
   */
  public async enqueue<T>(task: SyncTask<T>, label = 'sync_task'): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject, label });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.locked || this.queue.length === 0) return;

    this.locked = true;
    const current = this.queue.shift();
    if (!current) {
      this.locked = false;
      return;
    }

    this.activeTaskLabel = current.label;
    try {
      const result = await current.task();
      current.resolve(result);
    } catch (err) {
      console.warn(`[SyncMutexQueue] Task "${current.label}" failed:`, err);
      current.reject(err);
    } finally {
      this.activeTaskLabel = null;
      this.locked = false;
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 0);
      }
    }
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public isLocked(): boolean {
    return this.locked;
  }

  public getActiveTask(): string | null {
    return this.activeTaskLabel;
  }
}

export const globalSyncQueue = new SyncMutexQueue();

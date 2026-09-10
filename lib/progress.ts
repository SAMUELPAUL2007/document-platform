export type ProgressStage =
  | "validating"
  | "queued"
  | "loading"
  | "processing"
  | "finalizing"
  | "complete"
  | "failed"
  | "cancelled";

export interface ProgressSnapshot {
  percent: number;
  stage: ProgressStage;
  message?: string;
  current?: number;
  total?: number;
}

export type ProgressCallback = (snapshot: ProgressSnapshot) => void;

const STAGE_ORDER: ProgressStage[] = [
  "validating",
  "queued",
  "loading",
  "processing",
  "finalizing",
  "complete",
  "failed",
  "cancelled",
];

function stageIndex(s: ProgressStage): number {
  return STAGE_ORDER.indexOf(s);
}

export class ProgressTracker {
  private _percent = 0;
  private _stage: ProgressStage = "queued";
  private _message?: string;
  private _current?: number;
  private _total?: number;
  private _callback?: ProgressCallback;
  private _final = false;

  constructor(callback?: ProgressCallback) {
    this._callback = callback;
  }

  get percent(): number {
    return this._percent;
  }

  get stage(): ProgressStage {
    return this._stage;
  }

  get message(): string | undefined {
    return this._message;
  }

  get current(): number | undefined {
    return this._current;
  }

  get total(): number | undefined {
    return this._total;
  }

  get isFinal(): boolean {
    return this._final;
  }

  snapshot(): ProgressSnapshot {
    return {
      percent: this._percent,
      stage: this._stage,
      message: this._message,
      current: this._current,
      total: this._total,
    };
  }

  update(partial: Partial<ProgressSnapshot>): void {
    if (this._final) return;

    if (partial.percent !== undefined) {
      const clamped = Math.max(0, Math.min(100, Math.round(partial.percent)));
      if (clamped >= this._percent) {
        this._percent = clamped;
      }
    }

    if (partial.stage !== undefined) {
      const newIdx = stageIndex(partial.stage);
      const curIdx = stageIndex(this._stage);
      if (newIdx >= curIdx || partial.stage === "failed" || partial.stage === "cancelled") {
        this._stage = partial.stage;
      }
    }

    if (partial.message !== undefined) {
      this._message = partial.message;
    }

    if (partial.current !== undefined) {
      this._current = partial.current;
    }

    if (partial.total !== undefined) {
      this._total = partial.total;
    }

    if (
      this._stage === "complete" ||
      this._stage === "failed" ||
      this._stage === "cancelled"
    ) {
      this._final = true;
      if (this._stage === "complete") this._percent = 100;
    }

    this._callback?.(this.snapshot());
  }

  setProgress(current: number, total: number, stage?: ProgressStage): void {
    if (this._final) return;
    if (total <= 0) return;

    const pct = Math.round((current / total) * 100);
    this.update({
      percent: pct,
      current,
      total,
      stage: stage ?? this._stage,
    });
  }

  complete(message?: string): void {
    this.update({ stage: "complete", percent: 100, message });
  }

  fail(message?: string): void {
    this.update({ stage: "failed", message });
  }

  cancel(message?: string): void {
    this.update({ stage: "cancelled", message });
  }
}

export function createProgressTracker(callback?: ProgressCallback): ProgressTracker {
  return new ProgressTracker(callback);
}

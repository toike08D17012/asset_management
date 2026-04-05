import { startAutoSnapshotScheduler } from "./src/infrastructure/scheduling/auto-snapshot-scheduler";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    startAutoSnapshotScheduler();
  }
}
import {
  createEffect,
  createResource,
  createSignal,
  onCleanup,
} from "solid-js";
import type { DoorStatus, DoorStatusResponse } from "./types";
import { CurrentDoorStatus } from "./CurrentDoorStatus";
import { DoorStatusHistory } from "./DoorStatusHistory";

function getCurrentDoorStatus(): Promise<DoorStatusResponse> {
  return fetch("/api/currentDoorStatus").then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  });
}

function getDoorStatusHistory(): Promise<DoorStatusResponse[]> {
  return fetch("/api/doorStatusHistory").then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  });
}

export const doorStatusColors: Record<DoorStatus, string> = {
  open: "bg-green-500 text-white",
  closed: "bg-red-500 text-white",
  unknown: "bg-gray-500 text-white",
};

function App() {
  const [doorStatus, { refetch }] = createResource(getCurrentDoorStatus);
  const [doorStatusHistory, { refetch: refetchHistory }] =
    createResource(getDoorStatusHistory);
  const [doorStatusSinceSignal, setDoorStatusSince] = createSignal<
    string | null
  >(null);
  createEffect(() => {
    const since = doorStatus()?.since;
    if (doorStatusSinceSignal() !== since && since !== undefined) {
      // On future updates, refetch the history
      if (doorStatusSinceSignal() !== null) {
        refetchHistory();
      }
      // Update the signal with the new since value
      setDoorStatusSince(since);
    }
  });

  const refreshInterval = 5000; // Refresh every 5 seconds
  const refreshTimer = setInterval(() => {
    refetch();
  }, refreshInterval);
  onCleanup(() => {
    clearInterval(refreshTimer);
  });

  return (
    <div class="w-screen h-screen flex items-center justify-center bg-linear-to-br from-blue-200 to-yellow-200">
      <div class="text-center">
        <h1 class="text-4xl font-bold mb-4">
          <span class="px-2 rounded-xl bg-linear-to-br from-blue-600 to-yellow-500 text-white">
            CSSA
          </span>{" "}
          Common Room Status
        </h1>
        <CurrentDoorStatus doorStatus={doorStatus} refetch={refetch} />
        <div class="mt-8" />
        <DoorStatusHistory doorStatusHistory={doorStatusHistory} />
      </div>
    </div>
  );
}

export default App;

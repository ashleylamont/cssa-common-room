import { createResource, onCleanup } from "solid-js";
import type { DoorStatus, DoorStatusResponse } from "./types";

function getCurrentDoorStatus(): Promise<DoorStatusResponse> {
  return fetch("/api/currentDoorStatus").then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  });
}

const doorStatusColors: Record<DoorStatus, string> = {
  open: "bg-green-500 text-white",
  closed: "bg-red-500 text-white",
  unknown: "bg-gray-500 text-white",
};

function App() {
  const [doorStatus, { refetch }] = createResource(getCurrentDoorStatus);

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
        {/* Loading state */}
        {doorStatus.loading && doorStatus.latest === undefined && (
          <p class="text-xl text-gray-700">Loading...</p>
        )}
        {/* Error state */}
        {doorStatus.error && (
          <p class="text-xl text-red-600">
            Error fetching door status: {doorStatus.error.message}
          </p>
        )}
        {/* Success state */}
        {doorStatus.latest && (
          <div class="text-2xl font-semibold">
            <p class="mb-2">
              Current Door Status:{" "}
              <span
                class={`px-4 py-2 rounded-full ${
                  doorStatusColors[doorStatus.latest.status]
                }`}
                onClick={() => refetch()}
                classList={{
                  "cursor-pointer": doorStatus.latest.status !== "unknown",
                }}
              >
                {doorStatus()!.status}
              </span>
            </p>
            <p class="text-sm text-gray-600">
              Since: {new Date(doorStatus.latest.since).toLocaleString()}
            </p>
            <p class="text-sm text-gray-600">
              Last updated:{" "}
              {new Date(doorStatus.latest.fetchedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

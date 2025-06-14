import { Show, type Resource } from "solid-js";
import type { DoorStatusResponse } from "./types";
import { doorStatusColors } from "./App";

export function CurrentDoorStatus({
  doorStatus,
  refetch,
}: {
  doorStatus: Resource<DoorStatusResponse>;
  refetch: () => void;
}) {
  return (
    <>
      {/* Loading state */}
      <Show when={doorStatus.loading && doorStatus.latest === undefined}>
        <p class="text-xl text-gray-700">Loading...</p>
      </Show>
      {/* Error state */}
      <Show when={doorStatus.error}>
        <p class="text-xl text-red-600">
          Error fetching door status: {doorStatus.error.message}
        </p>
      </Show>
      {/* Success state */}
      <Show when={doorStatus.latest}>
        <div class="text-2xl font-semibold">
          <p class="mb-2">
            Current Door Status:{" "}
            <span
              class={`px-4 py-2 rounded-full ${
                doorStatusColors[doorStatus.latest!.status]
              }`}
              onClick={() => refetch()}
              classList={{
                "cursor-pointer": doorStatus.latest!.status !== "unknown",
              }}
            >
              {doorStatus()!.status}
            </span>
          </p>
          <p class="text-sm text-gray-600">
            Since: {new Date(doorStatus.latest!.since).toLocaleString()}
          </p>
          <p class="text-sm text-gray-600">
            Last updated:{" "}
            {new Date(doorStatus.latest!.fetchedAt).toLocaleString()}
          </p>
        </div>
      </Show>
    </>
  );
}

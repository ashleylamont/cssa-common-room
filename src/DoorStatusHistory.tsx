import {
  createMemo,
  createSignal,
  Index,
  onMount,
  Show,
  type Resource,
} from "solid-js";
import { DoorStatus, type DoorStatusResponse } from "./types";

function defaultMap<K extends string, V>(defaultValue: V): Record<K, V> {
  const baseObject: Record<K, V> = {} as Record<K, V>;
  return new Proxy(baseObject, {
    get: (target, prop: K) => {
      if (prop in target) {
        return target[prop];
      }
      return defaultValue;
    },
  });
}

function dateString(date: Date): string {
  return `${date.getFullYear().toString().padStart(4, "0")}-${(
    date.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

function getDaysBetweenDates(start: Date, end: Date): string[] {
  const days: string[] = [];
  const currentDate = new Date(start);
  while (currentDate <= end) {
    days.push(dateString(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  // Ensure the end date is included
  const endDateStr = dateString(end);
  if (!days.includes(endDateStr)) {
    days.push(endDateStr);
  }
  return days;
}

const timeString = (durationMs: number): string => {
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

interface FunUnit {
  name: string;
  duration: number; // Duration in milliseconds
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const funUnits: FunUnit[] = [
  {
    name: "Shrek viewings",
    duration: HOUR + 29 * MINUTE,
  },
  {
    name: "rick rolls",
    duration: 3 * MINUTE + 33 * SECOND,
  },
  {
    name: "Minecraft days",
    duration: 20 * MINUTE,
  },
  {
    name: "Lord of the Rings (Extended Edition) viewings",
    duration: 11 * HOUR + 20 * MINUTE,
  },
  {
    name: "francium 221 Half-Lives",
    duration: 4.8 * MINUTE,
  },
  {
    name: "default Linux TCP keepalive intervals",
    duration: 2 * HOUR,
  },
  {
    name: "frames at 60 FPS",
    duration: 16.67,
  },
  {
    name: "Windows XP startup sounds",
    duration: 3 * SECOND,
  },
  {
    name: "iOS alarm snoozes",
    duration: 9 * MINUTE,
  },
  {
    name: "un-skippable youtube ads",
    duration: 15 * SECOND,
  },
  {
    name: "Portal speedruns",
    duration: 5 * MINUTE + 39 * SECOND + 960,
  },
];
// Lock this selection in when the file is loaded
const randomFunUnit = funUnits[Math.floor(Math.random() * funUnits.length)];

export const DoorStatusHistory = ({
  doorStatusHistory,
}: {
  doorStatusHistory: Resource<DoorStatusResponse[]>;
}) => {
  const sortedDoorStatusHistory = createMemo(() => {
    // Sort in ascending order by the 'since' date
    return (doorStatusHistory.latest || []).slice().sort((a, b) => {
      // Since is an ISO date string, we can compare them directly via localeCompare
      return a.since.localeCompare(b.since);
    });
  });

  const dailyOpenDuration = createMemo(() => {
    const dailyOpenDurationObject: Record<string, number> = defaultMap(0);
    defaultMap(0);
    let lastStatus: DoorStatusResponse | null = null;
    for (const status of sortedDoorStatusHistory()) {
      // If we were previously open and now closed, calculate the time to add to days in that window
      if (
        lastStatus !== null &&
        lastStatus.status === DoorStatus.OPEN &&
        status.status !== DoorStatus.OPEN
      ) {
        const openDate = new Date(lastStatus.since);
        const closeDate = new Date(status.since);
        const days = getDaysBetweenDates(openDate, closeDate);
        for (const day of days) {
          const startOfDay = new Date(day);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(day);
          endOfDay.setHours(23, 59, 59, 999);
          const openStart = Math.max(openDate.getTime(), startOfDay.getTime());
          const openEnd = Math.min(closeDate.getTime(), endOfDay.getTime());
          dailyOpenDurationObject[day] =
            dailyOpenDurationObject[day] + openEnd - openStart;
        }
      }

      // Update the last status
      lastStatus = status;
    }

    return dailyOpenDurationObject;
  });

  const [currentTime, setCurrentTime] = createSignal(new Date());
  const timeRefresher = setInterval(() => {
    setCurrentTime(new Date());
  }, 1000); // Refresh every second
  createMemo(() => {
    // Cleanup the interval when the component is unmounted
    return () => clearInterval(timeRefresher);
  });
  const currentDate = createMemo(() => dateString(currentTime()));

  const oneYearAgo = createMemo(() => {
    const date = new Date(currentDate());
    date.setDate(date.getDate() - 52 * 7); // Go back one year
    // Get the first sunday after this date
    while (date.getDay() !== 0) {
      date.setDate(date.getDate() - 1);
    }
    return date;
  });

  const monthsInRange = createMemo(
    (): [
      monthNumber: number,
      monthName: string,
      year: number,
      weekNumber: number
    ][] => {
      const startDate = oneYearAgo();
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const months: [number, string, number, number][] = [];
      const WEEK = 7 * 24 * 60 * 60 * 1000; // One week in milliseconds
      // Start from the month of one year ago and go to the current month
      for (let i = startDate.getMonth(); months.length < 12; i = (i + 1) % 12) {
        const year =
          startDate.getFullYear() + (i < startDate.getMonth() ? 1 : 0);
        const newDate = new Date(startDate);
        newDate.setMonth(i);
        newDate.setFullYear(year);
        newDate.setDate(1); // Set to the first day of the month
        const weekNumber = Math.floor(
          (newDate.getTime() - startDate.getTime()) / WEEK
        );
        months.push([i, monthNames[i], year, Math.max(0, weekNumber)]);
      }
      // Add the current month for next year
      const currentDate = new Date(startDate);
      currentDate.setFullYear(startDate.getFullYear() + 1);
      currentDate.setDate(1); // Set to the first day of the current month
      months.push([
        startDate.getMonth(),
        monthNames[startDate.getMonth()],
        startDate.getFullYear() + 1,
        Math.floor((currentDate.getTime() - startDate.getTime()) / WEEK),
      ]);
      return months;
    }
  );

  const mostOpenDay = createMemo(() => {
    return Object.values(dailyOpenDuration()).reduce(
      (max, current) => Math.max(max, current),
      0
    );
  });

  const dateFromWeekAndDay = createMemo(
    () =>
      (weekNumber: number, dayNumber: number): string => {
        const startDate = new Date(oneYearAgo());
        while (dayNumber < startDate.getDay()) {
          startDate.setDate(startDate.getDate() - 1);
        }
        while (dayNumber > startDate.getDay()) {
          startDate.setDate(startDate.getDate() + 1);
        }
        for (let i = 0; i < weekNumber; i++) {
          startDate.setDate(startDate.getDate() + 7);
        }
        return dateString(startDate);
      }
  );

  onMount(() => {
    // Scroll to the current date
    const currentDateStr = currentDate();
    const currentElement = document.querySelector(
      `[data-date="${currentDateStr}"]`
    );
    if (currentElement) {
      currentElement.scrollIntoView({ behavior: "instant", block: "center" });
    }
  });

  const totalTimeOpen = createMemo(() => {
    return Object.values(dailyOpenDuration()).reduce(
      (total, current) => total + current,
      0
    );
  });

  return (
    <>
      <div class="font-semibold mb-2">
        The CSSA Common Room was open for{" "}
        {new Intl.NumberFormat("en-AU", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(totalTimeOpen() / randomFunUnit.duration)}{" "}
        {randomFunUnit.name} in the last year, or {timeString(totalTimeOpen())}.
      </div>
      <div
        class="grid gap-1"
        style={{
          "grid-template-rows": "[months] max-content repeat(7, 24px)",
          "grid-template-columns": "[day] max-content repeat(53, 24px)",
          "max-width": "90vw",
          "margin-left": "5vw",
          "margin-right": "5vw",
          overflow: "auto",
          "scrollbar-color": "var(--color-gray-700) transparent",
        }}
      >
        {/* Header Row */}
        <Index each={monthsInRange()}>
          {(month, monthIndex) => (
            <div
              class="flex justify-end flex-col text-left"
              style={{
                "grid-column-start": month()[3] + 2,
                "grid-column-end":
                  monthIndex === monthsInRange().length - 1
                    ? 55
                    : monthsInRange()[monthIndex + 1][3] + 1,
              }}
            >
              <Show when={month()[0] === 0 || monthIndex === 0}>
                <span class="font-bold">{month()[2]}</span>
              </Show>
              <span class="font-semibold">{month()[1]}</span>
            </div>
          )}
        </Index>
        {/* Days of the week */}
        <Index
          each={[
            undefined,
            "Mon",
            undefined,
            "Wed",
            undefined,
            "Fri",
            undefined,
          ]}
        >
          {(day, dayIndex) => (
            <>
              <div class="text-center font-semibold mr-1">{day() || ""}</div>
              <Index each={Array(53).fill(0)}>
                {(_, weekIndex) => (
                  <>
                    <div
                      class="w-6 h-6 bg-gray-800 rounded-sm static"
                      data-date={dateFromWeekAndDay()(weekIndex, dayIndex)}
                    >
                      <div
                        class="w-6 h-6 bg-green-400 rounded-sm relative left-0 top-0 hover-source"
                        style={{
                          opacity:
                            dailyOpenDuration()[
                              dateFromWeekAndDay()(weekIndex, dayIndex)
                            ] / Math.max(mostOpenDay(), 1),
                        }}
                        title={`Open for ${timeString(
                          dailyOpenDuration()[
                            dateFromWeekAndDay()(weekIndex, dayIndex)
                          ]
                        )} on ${dateFromWeekAndDay()(weekIndex, dayIndex)}`}
                      ></div>
                    </div>
                  </>
                )}
              </Index>
            </>
          )}
        </Index>
        {/* Legend */}
        <div
          style={{ "grid-column": "1 / -1" }}
          class="flex justify-end flex-row gap-2 font-bold mt-2"
        >
          Mostly Closed{" "}
          <div class="flex flex-row gap-1">
            <Index each={Array(6).fill(0)}>
              {(_, idx) => (
                <div class="w-6 h-6 bg-gray-800 rounded-sm static">
                  <div
                    class="w-6 h-6 bg-green-400 rounded-sm relative left-0 top-0 hover-source"
                    style={{
                      opacity: idx / 5, // Adjust opacity for the legend
                    }}
                    title={timeString((mostOpenDay() * idx) / 5)}
                  ></div>
                </div>
              )}
            </Index>
          </div>{" "}
          Mostly Open
        </div>
      </div>
    </>
  );
};

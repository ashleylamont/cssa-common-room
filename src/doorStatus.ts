import { readdir } from "node:fs/promises";
import { PrismaClient } from "../generated/prisma";
import { DoorStatus, type DoorStatusResponse } from "./types";

const DOOR_STATUS_URL = "https://members.cssa.club/commonRoom/status";
const POLLING_INTERVAL = 5000; // 5 seconds
const FRONTEND_PORT = 3000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchDoorStatus(): Promise<DoorStatus> {
  try {
    const response = await fetch(DOOR_STATUS_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = (await response.json()) as { status: boolean };
    return data.status ? DoorStatus.OPEN : DoorStatus.CLOSED;
  } catch (error) {
    console.error("Failed to fetch door status:", error);
    return DoorStatus.UNKNOWN;
  }
}

const prisma = new PrismaClient();

async function monitorDoorStatus(): Promise<void> {
  while (true) {
    const mostRecentCachedStatus = await prisma.doorStatus.findFirst({
      orderBy: {
        createdAt: "desc",
      },
    });
    let mostRecentCachedStatusValue: DoorStatus = DoorStatus.UNKNOWN;
    if (mostRecentCachedStatus?.status === "open") {
      mostRecentCachedStatusValue = DoorStatus.OPEN;
    } else if (mostRecentCachedStatus?.status === "closed") {
      mostRecentCachedStatusValue = DoorStatus.CLOSED;
    }
    const currentStatus = await fetchDoorStatus();
    if (currentStatus !== mostRecentCachedStatusValue) {
      console.log(
        `Door status changed at ${new Date().toLocaleString()}: ${mostRecentCachedStatusValue} -> ${currentStatus}`
      );
      await prisma.doorStatus.create({
        data: {
          status: currentStatus,
        },
      });
    }
    await delay(POLLING_INTERVAL);
  }
}

async function main() {
  // Kick off long-running door status monitoring
  monitorDoorStatus();

  // Check which frontend files are allowed to be served (to protect against directory traversal attacks)
  const allowedFiles: string[] = [];
  if (process.env.NODE_ENV === "production") {
    // In production, serve pre-built frontend files
    const files = await readdir("./dist", {
      withFileTypes: true,
      recursive: true,
    });
    const allowedFileExtensions = [
      ".html",
      ".js",
      ".css",
      ".png",
      ".jpg",
      ".jpeg",
      ".svg",
    ];
    for (const file of files) {
      const fileExtension = file.name.slice(file.name.lastIndexOf("."));
      if (file.isFile() && allowedFileExtensions.includes(fileExtension)) {
        const filePath = `${file.parentPath.replace("dist", "")}/${file.name}`;
        console.log(`Allowed file: ${filePath} (${fileExtension})`);
        allowedFiles.push(filePath);
      }
    }
  }
  console.log(`Found ${allowedFiles.length} allowed files in dist directory`);

  // Serve Door Status API
  console.log("Starting Door Status API on port 3001...");
  Bun.serve({
    port: 3001,
    routes: {
      "/api/currentDoorStatus": async () => {
        const mostRecentCachedStatus = await prisma.doorStatus.findFirst({
          orderBy: {
            createdAt: "desc",
          },
        });
        if (mostRecentCachedStatus === null) {
          return new Response(
            JSON.stringify({
              status: "unknown",
              since: new Date().toISOString(),
              fetchedAt: new Date().toISOString(), // for client-side use
            } satisfies DoorStatusResponse),
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return new Response(
          JSON.stringify({
            status: mostRecentCachedStatus.status as DoorStatus,
            since: mostRecentCachedStatus.createdAt.toISOString(),
            fetchedAt: new Date().toISOString(), // for client-side use
          } satisfies DoorStatusResponse),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      },
      "/api/doorStatusHistory": async () => {
        const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        const doorStatusHistory = await prisma.doorStatus.findMany({
          orderBy: {
            createdAt: "desc",
          },
          where: {
            createdAt: {
              gte: oneYearAgo,
            },
          },
        });
        return new Response(
          JSON.stringify(
            doorStatusHistory.map(
              (historyItem) =>
                ({
                  status: historyItem.status as DoorStatus,
                  since: historyItem.createdAt.toISOString(),
                  fetchedAt: new Date().toISOString(), // for client-side use
                } satisfies DoorStatusResponse)
            )
          ),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      },
    },
    fetch: (request) => {
      // Proxy requests to the pre-built frontend in production mode
      if (process.env.NODE_ENV === "production") {
        let url = new URL(request.url).pathname;
        if (url === "/" || url === "") {
          url = "/index.html"; // Serve index.html for root requests
        }
        // Check if the requested file is allowed
        if (!allowedFiles.includes(url)) {
          console.warn(`Blocked access to disallowed file: ${url}`);
          return new Response("Not Found", { status: 404 });
        }
        // Serve the requested file from the dist directory
        return new Response(Bun.file(`./dist${url}`));
      }
      // Proxy requests to the frontend in development mode
      const url = new URL(request.url);
      return fetch(`http://localhost:${FRONTEND_PORT}${url.pathname}`, request);
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

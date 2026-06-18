# Collaborative Kanban Board

A fast, local-first Kanban board with real-time multi-tab synchronization. Built with Next.js 14, Zustand, and Tailwind CSS v4.

## Features

- **Local-First Persistence**: State is saved to `localStorage` with a 250ms debounce to ensure data survives refreshes.
- **Real-Time Sync**: Live multi-tab collaboration using the `BroadcastChannel` API. Changes in one tab appear instantly in all others without a backend.
- **Drag and Drop**: Smooth card reordering and cross-column movement using `@dnd-kit`.
- **Inline Editing**: Rename columns and the board title directly on the page.
- **Rich Card Details**: Edit descriptions, priority, due dates, assignees, and add comments.
- **Search & Filter**: Instant search across card content and priority filtering.
- **Activity Log**: Audit trail of the last 20 actions, correctly attributing changes to the originating browser tab.
- **Tab Counter**: Live count of active browser tabs connected to the board.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **State Management**: Zustand (Normalized store)
- **Styling**: Tailwind CSS v4 (@theme tokens)
- **Drag and Drop**: @dnd-kit
- **Persistence**: localStorage
- **Sync**: BroadcastChannel API

## Synchronization Model

The app uses a **Single Source of Truth** pattern with an **Event-Driven Broadcast** model:

1.  **State Update**: When a user performs an action (e.g., moves a card), the local Zustand store is updated immediately.
2.  **Persistence**: The full board state is serialized and saved to `localStorage` (debounced by 250ms).
3.  **Broadcast**: A typed message containing the `originTabId` and necessary payload is sent over a `BroadcastChannel` named `kanban-board`.
4.  **Reception**: Other tabs listening on the same channel receive the message, verify it didn't originate from themselves, and apply the update to their own local Zustand store.

### Advanced Multi-Tab Scaling Performance

To safely scale beyond standard bounds (tested and verified smoothly with 10+ concurrent active browser tabs), several high-density coordination mechanisms are built in:
- **Broadcast Storm Protection (Handshake Jitter)**: When a new tab mounts and queries existing sessions, active sibling tabs stagger their handshake reply frames using a randomized delay (`0-150ms jitter`). This spreads the message volume across multiple event loop ticks, preventing browser socket throttling and frame drops.
- **$O(N)$ Targeted Messaging Routing**: Registration handshakes utilize a discrete `targetTabId` constraint boundary. Sibling tabs drop response packets at the intake layer if they are not the intended recipient, dropping concurrent network re-renders from an exponential $O(N^2)$ explosion down to linear $O(N)$ efficiency.
- **Heartbeat Self-Pruning Reconciler**: To ensure accurate presence tracking without specifications collision (as `BroadcastChannel` excludes echo frames back to the caller), each tab triggers its own presence heartbeat loop internally. This avoids accidental self-pruning decay blocks after 30 seconds of high-concurrency activity.

## Getting Started

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Run the development server:
    ```bash
    npm run dev
    ```

3.  Open [http://localhost:3000](http://localhost:3000) in multiple browser tabs to see the live synchronization in action.

## Architectural Decisions

- **Normalization**: The store uses flat maps for cards and columns to ensure O(1) lookups and efficient reordering.
- **SSR Handling**: Time-sensitive components (like the Activity Log with relative timestamps) are loaded using `next/dynamic` with `ssr: false` to prevent hydration mismatches.
- **Silent Dragging**: To avoid flooding the activity log and localStorage during drag operations, reordering is "silent" until the user lets go of the card.

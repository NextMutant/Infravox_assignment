import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useBoardStore } from "./useBoardStore";
import { getBroadcastChannel, broadcastMessage } from "@/lib/broadcast";
import { BroadcastMessage } from "@/types";
import { generateId } from "@/lib/ids";
import { getRandomAlias } from "@/lib/board-storage";

const HEARTBEAT_INTERVAL = 15000; // 15 seconds
const PRUNE_THRESHOLD = 30000; // 30 seconds

export const useSync = () => {
  const { 
    tabId, tabAlias, registerTab, unregisterTab, pruneTabs, 
    moveCard, addCard, updateCard, deleteCard, renameColumn, renameBoard 
  } = useBoardStore(useShallow((state) => ({
    tabId: state.tabId,
    tabAlias: state.tabAlias,
    registerTab: state.registerTab,
    unregisterTab: state.unregisterTab,
    pruneTabs: state.pruneTabs,
    moveCard: state.moveCard,
    addCard: state.addCard,
    updateCard: state.updateCard,
    deleteCard: state.deleteCard,
    renameColumn: state.renameColumn,
    renameBoard: state.renameBoard
  })));

  // Client-side identity initialization
  useEffect(() => {
    if (tabId === "server") {
      useBoardStore.setState({
        tabId: generateId(),
        tabAlias: getRandomAlias(),
      });
    }
  }, [tabId]);

  useEffect(() => {
    if (tabId === "server") return; // Wait until client-side identity is initialized

    const channel = getBroadcastChannel();
    if (!channel) return;

    // Register local tab immediately
    registerTab(tabId, tabAlias);

    const handleMessage = (event: MessageEvent<BroadcastMessage>) => {
      const message = event.data;
      
      // Ignore self messages
      if ("originTabId" in message && message.originTabId === tabId) return;
      if ("tabId" in message && message.tabId === tabId) return;

      // Auto-heartbeat: For any non-registration interaction message, refresh the sender's status
      if (message.type !== "tab:register" && message.type !== "tab:unregister") {
        if ("originTabId" in message && message.originTabId) {
          registerTab(message.originTabId);
        }
      }

      switch (message.type) {
        case "card:create":
          addCard(message.columnId, message.card.title, message.card, message.originTabId);
          break;
        case "card:update":
          updateCard(message.card.id, message.card, true, message.originTabId);
          break;
        case "card:delete":
          deleteCard(message.cardId, true, message.originTabId);
          break;
        case "card:move":
          moveCard(
            message.cardId, 
            message.fromColumnId, 
            message.toColumnId, 
            message.fromIndex, 
            message.toIndex,
            false,
            message.originTabId
          );
          break;
        case "column:rename":
          renameColumn(message.columnId, message.title, true, message.originTabId);
          break;
        case "board:rename":
          renameBoard(message.title, true, message.originTabId);
          break;
        case "tab:register":
          // If this registration message specifies a target and it's not us, ignore it completely.
          // This avoids the O(N^2) broadcast explosion where active tabs hear each other's responses to a new tab.
          if (message.targetTabId && message.targetTabId !== tabId) return;

          registerTab(message.tabId, message.tabAlias);
          if (message.isInitial) {
            // Stagger the response with a small randomized delay (0-150ms) to avoid a "broadcast storm"
            // where all active tabs flood the BroadcastChannel at the exact same millisecond.
            setTimeout(() => {
              // Target this specific handshake back to the tab that initialized it
              broadcastMessage({ type: "tab:register", tabId, tabAlias, targetTabId: message.tabId });
            }, Math.floor(Math.random() * 150));
          }
          break;
        case "tab:unregister":
          unregisterTab(message.tabId);
          break;
      }
    };

    channel.addEventListener("message", handleMessage);

    // Initial registration - mark as initial to trigger discovery
    // We use a small timeout to ensure the BroadcastChannel is fully connected in the new tab
    const initialRegistrationTimeout = setTimeout(() => {
      broadcastMessage({ type: "tab:register", tabId, tabAlias, isInitial: true });
    }, 150);

    // Heartbeat
    const heartbeatInterval = setInterval(() => {
      registerTab(tabId, tabAlias); // Keep local tab's lastSeen alive to prevent self-pruning after 30s
      broadcastMessage({ type: "tab:register", tabId, tabAlias });
    }, HEARTBEAT_INTERVAL);

    // Prune stale tabs
    const pruneInterval = setInterval(() => {
      pruneTabs(PRUNE_THRESHOLD);
    }, HEARTBEAT_INTERVAL);

    // Unregister on close
    const handleUnload = () => {
      broadcastMessage({ type: "tab:unregister", tabId });
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      channel.removeEventListener("message", handleMessage);
      clearTimeout(initialRegistrationTimeout);
      clearInterval(heartbeatInterval);
      clearInterval(pruneInterval);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [
    tabId, tabAlias, registerTab, unregisterTab, pruneTabs, 
    addCard, updateCard, deleteCard, moveCard, renameColumn, renameBoard
  ]);
};

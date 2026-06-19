import { RemoteDragEntry } from "@/types";

export type ColumnRenderItem =
  | { type: "card"; cardId: string }
  | { type: "remote-source-ghost"; drag: RemoteDragEntry }
  | { type: "remote-preview-slot"; drag: RemoteDragEntry };

export const buildColumnRenderItems = (
  columnId: string,
  orderedCardIds: string[],
  remoteDrags: Record<string, RemoteDragEntry>,
  tabId: string
): ColumnRenderItem[] => {
  const remoteEntries = Object.values(remoteDrags).filter(
    (drag) => drag.originTabId !== tabId
  );

  if (remoteEntries.length === 0) {
    return orderedCardIds.map((cardId) => ({ type: "card", cardId }));
  }

  const inTransitCardIds = new Set(remoteEntries.map((drag) => drag.cardId));

  const previewInjections = remoteEntries
    .filter(
      (drag) =>
        drag.previewColumnId === columnId && drag.previewIndex !== null
    )
    .map((drag) => ({
      index: drag.previewIndex as number,
      drag,
    }))
    .sort((a, b) => a.index - b.index);

  const items: ColumnRenderItem[] = [];
  let previewPtr = 0;

  for (let i = 0; i < orderedCardIds.length; i++) {
    while (
      previewPtr < previewInjections.length &&
      previewInjections[previewPtr].index === i
    ) {
      items.push({
        type: "remote-preview-slot",
        drag: previewInjections[previewPtr].drag,
      });
      previewPtr++;
    }

    const cardId = orderedCardIds[i];

    if (inTransitCardIds.has(cardId)) {
      const drag = remoteDrags[cardId];
      if (drag.fromColumnId === columnId && drag.fromIndex === i) {
        items.push({ type: "remote-source-ghost", drag });
      }
    } else {
      items.push({ type: "card", cardId });
    }
  }

  while (previewPtr < previewInjections.length) {
    items.push({
      type: "remote-preview-slot",
      drag: previewInjections[previewPtr].drag,
    });
    previewPtr++;
  }

  return items;
};

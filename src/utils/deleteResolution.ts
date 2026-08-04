/**
 * Pure helper: resolve a node id (person or couple) to the person ids
 * that should be deleted.
 *
 * - A regular person node has a numeric id → returns [id]
 * - A couple node has id like "couple-3" and stores person1/person2 in data
 *   → returns both person ids (or the valid subset)
 * - Anything else → returns []
 */
export function resolveDeletePersonIds(
  nodeId: string,
  nodes: { id: string; type?: string; data?: any }[],
): number[] {
  const node = nodes.find((n) => n.id === nodeId);
  if (node?.type === 'coupleNode') {
    const d = node.data as any;
    return [Number(d?.person1?.id), Number(d?.person2?.id)].filter(
      (n) => !isNaN(n),
    );
  }
  const n = Number(nodeId);
  return isNaN(n) ? [] : [n];
}

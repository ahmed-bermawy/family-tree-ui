import { MarkerType, type Edge, type Node } from '@xyflow/react';

/**
 * Shared family-graph building + layout.
 *
 * Handles monogamous couples (merged into a single "couple" node) and
 * polygamous families (a husband with several wives renders as individual
 * nodes — each wife keeps her own children under her).
 */

export const MIN_GAP = 40;
export const GENERATION_GAP = 160;

/**
 * Colours used for parent→child links. Every parent gets its own stable
 * colour, so the children of one parent read as a single family and lines
 * that cross are still easy to follow.
 * (Pink is reserved for marriage links.)
 */
const EDGE_PALETTE = [
  '#60a5fa', // blue
  '#34d399', // emerald
  '#fbbf24', // amber
  '#f87171', // red
  '#a78bfa', // violet
  '#22d3ee', // cyan
  '#fb923c', // orange
  '#4ade80', // green
  '#818cf8', // indigo
  '#2dd4bf', // teal
];

/** Stable colour for a node id (same parent → same colour, always). */
export function edgeColorFor(nodeId: string): string {
  let hash = 0;
  for (let i = 0; i < nodeId.length; i++) {
    hash = (hash * 31 + nodeId.charCodeAt(i)) >>> 0;
  }
  return EDGE_PALETTE[hash % EDGE_PALETTE.length];
}

/** Estimated node width used by the layout. */
export function getNodeWidth(nodeId: string, nodes: Node[]): number {
  const node = nodes.find((n) => n.id === nodeId);
  return node?.type === 'coupleNode' ? 320 : 170;
}

export interface GraphPayload {
  nodes: { id: number; name: string; gender?: string; photo?: string }[];
  edges: { id: number; type: string; from: number; to: number }[];
}

export interface BuiltGraph {
  nodes: Node[];
  edges: Edge[];
  /** Node ids that belong to a polygamous family (husband + wives) */
  polygamousIds: Set<string>;
  /**
   * person id → ids of that person's parent PERSONS, taken from the raw
   * relationships (the rendered edges drop the father→child link in
   * polygamous families, and a couple node mixes two people).
   */
  parentsByPerson: Map<string, string[]>;
  /** person id → gender */
  personGenders: Map<string, string>;
}

/** Build React Flow nodes + edges from the API graph payload. */
export function buildFamilyGraph(
  graph: GraphPayload,
  onNodeClick?: (id: string) => void,
): BuiltGraph {
  const spouseEdges = graph.edges.filter((e) => e.type === 'spouse');

  // ── polygamy detection ────────────────────────────────────────────────
  const spousePartners = new Map<string, string[]>();
  spouseEdges.forEach((se) => {
    const f = String(se.from);
    const t = String(se.to);
    if (!spousePartners.has(f)) spousePartners.set(f, []);
    spousePartners.get(f)!.push(t);
    if (!spousePartners.has(t)) spousePartners.set(t, []);
    spousePartners.get(t)!.push(f);
  });

  const polygamous = new Set<string>(); // husbands with more than one wife
  graph.nodes.forEach((p) => {
    if (p.gender === 'male' && (spousePartners.get(String(p.id)) || []).length > 1) {
      polygamous.add(String(p.id));
    }
  });

  const polygamousIds = new Set<string>();
  polygamous.forEach((husbandId) => {
    polygamousIds.add(husbandId);
    (spousePartners.get(husbandId) || []).forEach((w) => polygamousIds.add(w));
  });

  // ── parent lookup (both relationship conventions) ─────────────────────
  const parentsOf = new Map<string, string[]>();
  graph.edges.forEach((e) => {
    if (e.type === 'parent') {
      const c = String(e.to);
      if (!parentsOf.has(c)) parentsOf.set(c, []);
      parentsOf.get(c)!.push(String(e.from));
    } else if (e.type === 'child') {
      const c = String(e.from);
      if (!parentsOf.has(c)) parentsOf.set(c, []);
      parentsOf.get(c)!.push(String(e.to));
    }
  });

  // ── couples (monogamous only — polygamous families stay separate) ─────
  const coupled = new Set<number>();
  const coupleMap = new Map<string, { id: string; p1: any; p2: any }>();
  spouseEdges.forEach((se, idx) => {
    const p1 = graph.nodes.find((n) => n.id === se.from);
    const p2 = graph.nodes.find((n) => n.id === se.to);
    if (!p1 || !p2) return;
    if (polygamousIds.has(String(se.from)) || polygamousIds.has(String(se.to))) return;
    const coupleId = `couple-${idx}`;
    coupleMap.set(String(se.from), { id: coupleId, p1, p2 });
    coupleMap.set(String(se.to), { id: coupleId, p1, p2 });
    coupled.add(se.from);
    coupled.add(se.to);
  });

  // ── parent info kept from the RAW relationships, keyed by PERSON ──────
  // (the rendered edges drop the father→child link in polygamous families,
  //  and a couple node holds two different people)
  const parentsByPerson = new Map<string, string[]>();
  const personGenders = new Map<string, string>();
  graph.nodes.forEach((p) => personGenders.set(String(p.id), p.gender || ''));
  graph.edges.forEach((e) => {
    if (e.type === 'spouse') return;
    const parentId = e.type === 'child' ? String(e.to) : String(e.from);
    const childId = e.type === 'child' ? String(e.from) : String(e.to);
    if (!parentsByPerson.has(childId)) parentsByPerson.set(childId, []);
    if (!parentsByPerson.get(childId)!.includes(parentId)) {
      parentsByPerson.get(childId)!.push(parentId);
    }
  });

  // ── child links (parent → child), re-attached to the mother ───────────
  const childLinks: { parent: string; child: string; type: string }[] = [];
  const seenPairs = new Set<string>();
  graph.edges.forEach((e) => {
    if (e.type === 'spouse') return;
    const parentId = e.type === 'child' ? String(e.to) : String(e.from);
    const childId = e.type === 'child' ? String(e.from) : String(e.to);

    // A polygamous father's children hang off their own mother's node
    let effectiveParent = parentId;
    if (polygamous.has(parentId)) {
      const wives = spousePartners.get(parentId) || [];
      const mother = (parentsOf.get(childId) || []).find((p) => wives.includes(p));
      if (mother) effectiveParent = mother;
    }

    const parentNodeId = coupleMap.get(effectiveParent)?.id ?? effectiveParent;
    const childNodeId = coupleMap.get(childId)?.id ?? childId;
    const key = `${parentNodeId}->${childNodeId}`;
    if (seenPairs.has(key)) return; // child reached the same node twice
    seenPairs.add(key);
    childLinks.push({ parent: parentNodeId, child: childNodeId, type: e.type });
  });

  // ── nodes ─────────────────────────────────────────────────────────────
  const nodes: Node[] = [];
  const addedCouples = new Set<string>();
  graph.nodes.forEach((p) => {
    if (coupled.has(p.id)) {
      const c = coupleMap.get(String(p.id));
      if (c && !addedCouples.has(c.id)) {
        addedCouples.add(c.id);
        nodes.push({
          id: c.id,
          type: 'coupleNode',
          position: { x: 0, y: 0 },
          data: {
            person1: { id: String(c.p1.id), name: c.p1.name, gender: c.p1.gender || '', photo: c.p1.photo || '' },
            person2: { id: String(c.p2.id), name: c.p2.name, gender: c.p2.gender || '', photo: c.p2.photo || '' },
            onClick: onNodeClick ? () => onNodeClick(c.id) : undefined,
          },
        });
      }
    } else {
      nodes.push({
        id: String(p.id),
        type: 'personNode',
        position: { x: 0, y: 0 },
        data: {
          name: p.name,
          gender: p.gender,
          photo: p.photo || '',
          onClick: onNodeClick ? () => onNodeClick(String(p.id)) : undefined,
        },
      });
    }
  });

  // ── edges (everything leaves from BELOW, enters from ABOVE) ───────────
  // Each parent→child link is coloured by its PARENT so a family's children
  // are instantly recognisable and crossing links stay readable.
  const treeEdges: Edge[] = childLinks.map((l) => {
    const color = edgeColorFor(l.parent);
    return {
      id: `child-${l.parent}-${l.child}`,
      source: l.parent,
      target: l.child,
      sourceHandle: 'tree-bottom',
      targetHandle: 'tree-top',
      type: 'smoothstep',
      animated: false,
      style: { stroke: color, strokeWidth: 2.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color },
      data: { type: l.type, color },
    };
  });

  // Marriage links for polygamous families (nodes are separate, so draw them)
  const marriageEdges: Edge[] = spouseEdges
    .filter((se) => polygamousIds.has(String(se.from)) || polygamousIds.has(String(se.to)))
    .map((se) => {
      const f = String(se.from);
      const t = String(se.to);
      // the polygamous husband is always the anchor (source)
      const husband = polygamous.has(f) ? f : t;
      const wife = husband === f ? t : f;
      return {
        id: `marriage-${se.id}`,
        source: husband,
        target: wife,
        // Leaves the husband's BOTTOM and enters the wife's TOP
        // (wives sit in a row right below the husband)
        sourceHandle: 'tree-bottom',
        targetHandle: 'tree-top',
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#ec4899', strokeWidth: 2, strokeDasharray: '6 4' },
        data: { type: 'spouse' },
      } as Edge;
    });

  return {
    nodes,
    edges: [...treeEdges, ...marriageEdges],
    polygamousIds,
    parentsByPerson,
    personGenders,
  };
}

/** Position the graph: generations top→bottom, wives in their husband's row. */
export function layoutFamilyGraph(nodes: Node[], edges: Edge[]): Node[] {
  const spouseEdges = edges.filter((e) => e.data?.type === 'spouse');
  const hierarchyEdges = edges.filter((e) => e.data?.type !== 'spouse');

  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  for (const e of hierarchyEdges) {
    if (!children.has(e.source)) children.set(e.source, []);
    children.get(e.source)!.push(e.target);
    if (!parents.has(e.target)) parents.set(e.target, []);
    parents.get(e.target)!.push(e.source);
  }

  // BFS levels
  const level = new Map<string, number>();
  const queue: string[] = [];
  for (const n of nodes) {
    if (!parents.has(n.id) || parents.get(n.id)!.length === 0) {
      level.set(n.id, 0);
      queue.push(n.id);
    }
  }
  while (queue.length > 0) {
    const current = queue.shift()!;
    const curLevel = level.get(current) || 0;
    for (const child of children.get(current) || []) {
      const next = curLevel + 1;
      if (!level.has(child) || level.get(child)! < next) {
        level.set(child, next);
        queue.push(child);
      }
    }
  }

  const positioned = new Map<string, { x: number; y: number }>();

  function calcSubtreeWidth(nodeId: string): number {
    const myWidth = getNodeWidth(nodeId, nodes);
    const kidList = children.get(nodeId) || [];
    if (kidList.length === 0) return myWidth;
    const kidWidths = kidList.map((k) => calcSubtreeWidth(k));
    const span = kidWidths.reduce((a, b) => a + b, 0) + (kidList.length - 1) * MIN_GAP;
    return Math.max(myWidth, span);
  }

  function positionNode(nodeId: string, centerX: number, y: number) {
    positioned.set(nodeId, { x: centerX - getNodeWidth(nodeId, nodes) / 2, y });
    const kidList = children.get(nodeId) || [];
    if (kidList.length === 0) return;
    const kidWidths = kidList.map((k) => calcSubtreeWidth(k));
    const span = kidWidths.reduce((a, b) => a + b, 0) + (kidList.length - 1) * MIN_GAP;
    let kidX = centerX - span / 2;
    for (let i = 0; i < kidList.length; i++) {
      positionNode(kidList[i], kidX + kidWidths[i] / 2, y + GENERATION_GAP);
      kidX += kidWidths[i] + MIN_GAP;
    }
  }

  // ── polygamy: wives are positioned relative to their husband ──────────
  const wifeIds = new Set<string>();
  const wivesByHusband = new Map<string, string[]>();
  for (const e of spouseEdges) {
    wifeIds.add(e.target);
    if (!wivesByHusband.has(e.source)) wivesByHusband.set(e.source, []);
    if (!wivesByHusband.get(e.source)!.includes(e.target)) {
      wivesByHusband.get(e.source)!.push(e.target);
    }
  }

  const roots = nodes.filter((n) => level.get(n.id) === 0 && !wifeIds.has(n.id));
  if (roots.length === 1) {
    positionNode(roots[0].id, 0, 0);
  } else if (roots.length > 1) {
    const rootWidths = roots.map((r) => calcSubtreeWidth(r.id));
    const total = rootWidths.reduce((a, b) => a + b, 0) + (roots.length - 1) * MIN_GAP;
    let x = -total / 2;
    for (let i = 0; i < roots.length; i++) {
      positionNode(roots[i].id, x + rootWidths[i] / 2, 0);
      x += rootWidths[i] + MIN_GAP;
    }
  }

  function moveSubtree(nodeId: string, dx: number, newY: number, visited = new Set<string>()) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const p = positioned.get(nodeId) || { x: 0, y: newY };
    positioned.set(nodeId, { x: p.x + dx, y: newY });
    for (const kid of children.get(nodeId) || []) {
      moveSubtree(kid, dx, newY + GENERATION_GAP, visited);
    }
  }

  for (const [husbandId, wives] of wivesByHusband) {
    const hp = positioned.get(husbandId);
    if (!hp) continue;
    const ordered = [...wives].sort((a, b) => Number(a) - Number(b));

    // lay out each wife's own branch (her children) first
    for (const wifeId of ordered) positionNode(wifeId, 0, 0);

    // The wives form a centred row BELOW the husband, spaced by their own
    // subtree width so each wife's children stay under her.
    const widths = ordered.map((w) => calcSubtreeWidth(w));
    const totalW =
      widths.reduce((a, b) => a + b, 0) + (ordered.length - 1) * MIN_GAP;
    const husbandCenter = hp.x + getNodeWidth(husbandId, nodes) / 2;
    const wifeY = hp.y + GENERATION_GAP;

    // Every node that belongs to this family (the wives + their descendants)
    // must be excluded from the "unrelated row occupants" below, otherwise a
    // wife's own children would be mistaken for strangers and pushed away.
    const familyNodes = new Set<string>();
    const collectFamily = (nodeId: string) => {
      if (familyNodes.has(nodeId)) return;
      familyNodes.add(nodeId);
      for (const kid of children.get(nodeId) || []) collectFamily(kid);
    };
    ordered.forEach(collectFamily);

    // Unrelated nodes already sitting in the wives' row must move aside
    const rowOccupants = [...positioned.entries()].filter(
      ([id, p]) =>
        id !== husbandId &&
        !familyNodes.has(id) &&
        Math.abs(p.y - wifeY) < 1,
    );

    let cursor = husbandCenter - totalW / 2;
    for (let i = 0; i < ordered.length; i++) {
      const wifeId = ordered[i];
      const wifeW = getNodeWidth(wifeId, nodes);
      const subW = widths[i];
      const targetX = cursor + (subW - wifeW) / 2;
      const wp = positioned.get(wifeId) || { x: 0, y: wifeY };
      moveSubtree(wifeId, targetX - wp.x, wifeY);
      cursor += subW + MIN_GAP;
    }

    // Push unrelated nodes in that row to the right of the wives block
    let pushX = husbandCenter + totalW / 2 + MIN_GAP;
    for (const [id, p] of rowOccupants) {
      moveSubtree(id, pushX - p.x, p.y);
      pushX += getNodeWidth(id, nodes) + MIN_GAP;
    }
  }

  // orphans
  let maxY = 0;
  for (const [, pos] of positioned) if (pos.y > maxY) maxY = pos.y;
  for (const n of nodes) {
    if (!positioned.has(n.id)) {
      maxY += GENERATION_GAP;
      positioned.set(n.id, { x: 0, y: maxY });
    }
  }

  // ── Detached parents → park them OUTSIDE the tree block ─────────────
  // A root whose children sit several rows lower is not part of the main
  // trunk (e.g. the father of a wife who married into the family). Keeping
  // it inside would crowd an occupied row, so it stays on the top row but
  // is placed clear of the tree's horizontal span — its link then drops
  // down through free space instead of cutting through a row.
  const rootIds = new Set(roots.map((r) => r.id));
  const detached = nodes.filter((n) => {
    if (!rootIds.has(n.id)) return false;
    const kids = children.get(n.id) || [];
    if (kids.length === 0) return false;
    const p = positioned.get(n.id);
    if (!p) return false;
    let minKidY = Infinity;
    for (const kid of kids) {
      const kp = positioned.get(kid);
      if (kp && kp.y < minKidY) minKidY = kp.y;
    }
    return Number.isFinite(minKidY) && minKidY - p.y > GENERATION_GAP + 1;
  });

  if (detached.length > 0) {
    const detachedIds = new Set(detached.map((d) => d.id));
    let treeRight = -Infinity;
    for (const [id, p] of positioned) {
      if (detachedIds.has(id)) continue;
      treeRight = Math.max(treeRight, p.x + getNodeWidth(id, nodes));
    }
    let cursor = treeRight + MIN_GAP * 3;
    for (const d of detached) {
      positioned.set(d.id, { x: cursor, y: 0 });
      cursor += getNodeWidth(d.id, nodes) + MIN_GAP;
    }
  }

  // ── De-overlap each row horizontally ────────────────────────────────
  const rowYs = [...new Set([...positioned.values()].map((p) => p.y))];
  for (const rowY of rowYs) {
    const ids = [...positioned.entries()]
      .filter(([, p]) => Math.abs(p.y - rowY) < 1)
      .map(([id]) => id)
      .sort((a, b) => positioned.get(a)!.x - positioned.get(b)!.x);
    let cursor = -Infinity;
    for (const id of ids) {
      const p = positioned.get(id)!;
      const w = getNodeWidth(id, nodes);
      if (p.x < cursor) positioned.set(id, { x: cursor, y: p.y });
      cursor = positioned.get(id)!.x + w + MIN_GAP;
    }
  }

  // center horizontally
  let minX = Infinity;
  let maxX = -Infinity;
  for (const [id, p] of positioned) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x + getNodeWidth(id, nodes));
  }
  if (isFinite(minX) && isFinite(maxX)) {
    const shift = -(minX + maxX) / 2;
    for (const [id, p] of positioned) positioned.set(id, { x: p.x + shift, y: p.y });
  }

  return nodes.map((n) => ({ ...n, position: positioned.get(n.id) || { x: 0, y: 0 } }));
}

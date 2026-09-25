/**
 * Guest tree store — a local-only stand-in for the API.
 *
 * The editor was written against the REST endpoints; this module mimics the
 * exact same response shapes ({ tree, nodes, edges }) so the same editor can
 * run without an account. Everything lives in localStorage, so a refresh (or
 * a trip to /register) never loses the work.
 */

const STORAGE_KEY = 'ft_guest_tree';

export interface GuestPerson {
  id: number;
  name: string;
  gender?: string;
  photo?: string | null;
  birthDate?: string | null;
  birthPrecision?: string | null;
  deathDate?: string | null;
  deathPrecision?: string | null;
  notes?: string | null;
}

export interface GuestEdge {
  id: number;
  type: string;
  from: number;
  to: number;
}

export interface GuestTree {
  id: number;
  name: string;
  shareCode: string;
  guest: true;
  /** "age-desc" = eldest on the right (default) · "age-asc" = eldest on the left. */
  layoutOrder?: 'age-desc' | 'age-asc';
  /** Hand-dragged positions keyed by a stable node key ("p:222" · "c:222-224"). */
  nodePositions?: Record<string, { x: number; y: number }>;
}

export interface GuestState {
  tree: GuestTree;
  nodes: GuestPerson[];
  edges: GuestEdge[];
}

const EMPTY: GuestState = {
  tree: { id: 0, name: 'My Family Tree', shareCode: '', guest: true },
  nodes: [],
  edges: [],
};

function read(): GuestState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY, tree: { ...EMPTY.tree }, nodes: [], edges: [] };
    const parsed = JSON.parse(raw) as GuestState;
    return {
      tree: { ...EMPTY.tree, ...(parsed.tree || {}) },
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    };
  } catch {
    return { ...EMPTY, tree: { ...EMPTY.tree }, nodes: [], edges: [] };
  }
}

function write(state: GuestState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded (usually a big photo) — keep the tree, drop the photos.
    try {
      const light: GuestState = {
        ...state,
        nodes: state.nodes.map((n) => ({ ...n, photo: null })),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(light));
    } catch {
      /* give up silently — the in-memory tree still works */
    }
  }
}

function nextId(items: { id: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

/** Shrink a photo to a thumbnail data URL — localStorage is only ~5 MB. */
async function toThumbnail(file: File, max = 320): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** A person plus everyone below them (children, grandchildren, …). */
function collectDescendants(state: GuestState, rootId: number): number[] {
  const ids = new Set<number>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    state.edges
      .filter((e) => e.type !== 'spouse' && ids.has(e.to) && !ids.has(e.from))
      .forEach((e) => {
        ids.add(e.from);
        grew = true;
      });
  }
  return [...ids];
}

export const guestStore = {
  /** Is there a guest tree with at least one person in it? */
  hasTree(): boolean {
    return read().nodes.length > 0;
  },

  state(): GuestState {
    return read();
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },

  /** Mirrors PATCH /trees/:id/layout — keeps the guest's arrangement locally. */
  updateLayout(data: {
    layoutOrder?: 'age-desc' | 'age-asc';
    nodePositions?: Record<string, { x: number; y: number }>;
  }): Promise<GuestTree> {
    const st = read();
    if (data.layoutOrder !== undefined) st.tree.layoutOrder = data.layoutOrder;
    if (data.nodePositions !== undefined) st.tree.nodePositions = data.nodePositions;
    write(st);
    return Promise.resolve(st.tree);
  },

  /** Mirrors GET /trees/:id/graph */
  getGraph(): Promise<GuestState> {
    return Promise.resolve(read());
  },

  /** Mirrors POST /persons */
  createPerson(data: {
    name: string;
    gender?: string;
    birthDate?: string | null;
    birthPrecision?: string | null;
    deathDate?: string | null;
    deathPrecision?: string | null;
  }): Promise<GuestPerson> {
    const state = read();
    const person: GuestPerson = {
      id: nextId(state.nodes),
      name: data.name,
      gender: data.gender,
      birthDate: data.birthDate ?? null,
      birthPrecision: data.birthPrecision ?? null,
      deathDate: data.deathDate ?? null,
      deathPrecision: data.deathPrecision ?? null,
      photo: null,
      notes: null,
    };
    state.nodes.push(person);
    write(state);
    return Promise.resolve(person);
  },

  /** Mirrors PATCH /persons/:id */
  updatePerson(id: number, data: Partial<GuestPerson>): Promise<GuestPerson | null> {
    const state = read();
    const person = state.nodes.find((n) => n.id === id);
    if (!person) return Promise.resolve(null);
    Object.assign(person, data);
    write(state);
    return Promise.resolve(person);
  },

  /** Mirrors DELETE /persons/:id — descendants only, never spouses or parents. */
  deletePerson(id: number): Promise<void> {
    const state = read();
    const doomed = new Set(collectDescendants(state, id));
    state.nodes = state.nodes.filter((n) => !doomed.has(n.id));
    state.edges = state.edges.filter((e) => !doomed.has(e.from) && !doomed.has(e.to));
    write(state);
    return Promise.resolve();
  },

  /** Mirrors POST /persons/batch-delete */
  async batchDelete(ids: number[]): Promise<void> {
    for (const id of ids) await this.deletePerson(id);
  },

  /** Mirrors POST /relationships */
  createRelationship(data: { fromPersonId: number; toPersonId: number; type: string }): Promise<GuestEdge> {
    const state = read();
    const edge: GuestEdge = {
      id: nextId(state.edges),
      type: data.type,
      from: data.fromPersonId,
      to: data.toPersonId,
    };
    state.edges.push(edge);
    write(state);
    return Promise.resolve(edge);
  },

  /** Mirrors DELETE /relationships/:id */
  deleteRelationship(id: number): Promise<void> {
    const state = read();
    state.edges = state.edges.filter((e) => e.id !== id);
    write(state);
    return Promise.resolve();
  },

  /** Mirrors POST /upload/:personId — stores a thumbnail data URL locally. */
  async uploadPhoto(personId: number, file: File): Promise<{ photo: string }> {
    const photo = await toThumbnail(file);
    const state = read();
    const person = state.nodes.find((n) => n.id === personId);
    if (person) {
      person.photo = photo;
      write(state);
    }
    return { photo };
  },
};

/**
 * Push a finished guest tree into the account.
 * Runs after sign-up: create the tree, then its people, then the links.
 */
export async function importGuestTree(
  createTree: (name: string) => Promise<{ id: number }>,
  createPerson: (data: {
    name: string;
    gender?: string;
    birthDate?: string | null;
    birthPrecision?: string | null;
    deathDate?: string | null;
    deathPrecision?: string | null;
    treeId: number;
  }) => Promise<{ id: number }>,
  createRelationship: (data: { fromPersonId: number; toPersonId: number; type: string }) => Promise<unknown>,
  uploadPhoto?: (personId: number, blob: Blob) => Promise<unknown>,
): Promise<number | null> {
  const state = read();
  if (!state.nodes.length) return null;

  const tree = await createTree(state.tree.name || 'My Family Tree');

  // guest id → server id
  const idMap = new Map<number, number>();
  for (const person of state.nodes) {
    const created = await createPerson({
      name: person.name,
      gender: person.gender,
      birthDate: person.birthDate ?? null,
      birthPrecision: person.birthPrecision ?? null,
      deathDate: person.deathDate ?? null,
      deathPrecision: person.deathPrecision ?? null,
      treeId: tree.id,
    });
    idMap.set(person.id, created.id);
  }

  for (const edge of state.edges) {
    const from = idMap.get(edge.from);
    const to = idMap.get(edge.to);
    if (from == null || to == null) continue;
    try {
      await createRelationship({ fromPersonId: from, toPersonId: to, type: edge.type });
    } catch {
      // one bad link must not abort the whole import
    }
  }

  // photos last — a failure here is not worth losing the tree over
  if (uploadPhoto) {
    for (const person of state.nodes) {
      if (!person.photo || !person.photo.startsWith('data:')) continue;
      const serverId = idMap.get(person.id);
      if (serverId == null) continue;
      try {
        const blob = await (await fetch(person.photo)).blob();
        await uploadPhoto(serverId, blob);
      } catch {
        /* ignore */
      }
    }
  }

  guestStore.clear();
  return tree.id;
}

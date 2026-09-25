import { trees, persons, relationships } from './endpoints';
import { guestStore } from '../utils/guestStore';

/**
 * One interface, two back ends.
 *
 * The editor talks to this instead of the endpoints directly, so the exact
 * same page can run against the server (a saved tree) or against localStorage
 * (a guest building their first tree without an account).
 */
export interface GraphResult {
  tree: { id: number; name: string; shareCode?: string };
  nodes: {
    id: number;
    name: string;
    gender?: string;
    photo?: string | null;
    birthDate?: string | null;
    birthPrecision?: string | null;
    deathDate?: string | null;
    deathPrecision?: string | null;
  }[];
  edges: { id: number; type: string; from: number; to: number }[];
  /** Automatic sibling order where no hand-dragged position exists. */
  layoutOrder?: 'age-desc' | 'age-asc' | null;
  /** Hand-dragged positions keyed by a stable node key ("p:222" · "c:222-224"). */
  nodePositions?: Record<string, { x: number; y: number }> | null;
}

export interface LayoutWrite {
  layoutOrder?: 'age-desc' | 'age-asc';
  nodePositions?: Record<string, { x: number; y: number }>;
}

export interface PersonWrite {
  name?: string;
  gender?: string;
  birthDate?: string | null;
  birthPrecision?: string | null;
  deathDate?: string | null;
  deathPrecision?: string | null;
}

export interface DataSource {
  /** true while working locally — no account, no server */
  readonly isGuest: boolean;
  getTree(): Promise<{ id: number; name: string; shareCode?: string }>;
  getGraph(): Promise<GraphResult>;
  createPerson(data: PersonWrite & { name: string }): Promise<{ id: number }>;
  updatePerson(id: number, data: PersonWrite): Promise<unknown>;
  deletePerson(id: number): Promise<unknown>;
  batchDelete(ids: number[]): Promise<unknown>;
  createRelationship(data: { fromPersonId: number; toPersonId: number; type: string }): Promise<unknown>;
  uploadPhoto(personId: number, file: File): Promise<unknown>;
  /** Persist the sibling order and/or hand-dragged node positions. */
  updateLayout(data: LayoutWrite): Promise<unknown>;
}

/** Server-backed source for a saved tree. */
export function apiSource(treeId: number): DataSource {
  return {
    isGuest: false,
    getTree: () => trees.get(treeId),
    getGraph: () => trees.graph(treeId) as Promise<GraphResult>,
    createPerson: (data) => persons.create({ ...data, treeId }),
    updatePerson: (id, data) => persons.update(id, data),
    deletePerson: (id) => persons.delete(id),
    batchDelete: (ids) => persons.batchDelete(ids),
    createRelationship: (data) => relationships.create(data),
    uploadPhoto: (id, file) => persons.uploadPhoto(id, file),
    updateLayout: (data) => trees.updateLayout(treeId, data),
  };
}

/** Local-only source for the guest builder. */
export const guestSource: DataSource = {
  isGuest: true,
  getTree: () => guestStore.getGraph().then((s) => s.tree),
  getGraph: () => guestStore.getGraph() as Promise<GraphResult>,
  createPerson: (data) => guestStore.createPerson(data),
  updatePerson: (id, data) => guestStore.updatePerson(id, data),
  deletePerson: (id) => guestStore.deletePerson(id),
  batchDelete: (ids) => guestStore.batchDelete(ids),
  createRelationship: (data) => guestStore.createRelationship(data),
  uploadPhoto: (id, file) => guestStore.uploadPhoto(id, file),
  updateLayout: (data) => guestStore.updateLayout(data),
};

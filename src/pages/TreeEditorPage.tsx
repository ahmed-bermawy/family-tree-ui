import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  getNodesBounds,
  type Node,
  type Edge,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { apiSource, guestSource } from '../api/dataSource';
import UserMenu from '../components/UserMenu';
import PersonNode from '../components/PersonNode';
import CoupleNode from '../components/CoupleNode';
import NodeContextMenu from '../components/NodeContextMenu';
import PersonFormModal from '../components/PersonFormModal';
import DateField from '../components/DateField';
import { dateToApi, dateFromApi, EMPTY_DATE, type DateEdit } from '../utils/lifeDates';
import LinkPersonModal from '../components/LinkPersonModal';
import TreeToolbar from '../components/TreeToolbar';
import ShareModal from '../components/ShareModal';
import ConfirmModal from '../components/ConfirmModal';
import ImageCropModal from '../components/ImageCropModal';
import Toast from '../components/Toast';
import { toCanvas } from 'html-to-image';
import { useI18n } from '../i18n/I18nContext';
import { resolveDeletePersonIds } from '../utils/deleteResolution';
import { buildFamilyGraph, layoutFamilyGraph, nodeKey } from '../utils/familyGraph';
import {
  upcomingBirthdays,
  whatsappGreeting,
  formatBirthday,
  type BirthdayPerson,
} from '../utils/birthdays';
import { isValidName, stripDigits } from '../utils/nameValidation';

const nodeTypes = { personNode: PersonNode, coupleNode: CoupleNode };

export default function TreeEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang, toggleLang } = useI18n();
  const treeId = Number(id);
  // No :id means we are on /try — the guest builder. Everything is kept in
  // localStorage and nothing is sent to the server until the visitor signs up.
  const isGuest = !id;
  const ds = useMemo(() => (isGuest ? guestSource : apiSource(treeId)), [isGuest, treeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  // Parent info straight from the raw relationships (used for menu rules)
  const [graphInfo, setGraphInfo] = useState<{
    parentsByPerson: Map<string, string[]>;
    personGenders: Map<string, string>;
  }>({ parentsByPerson: new Map(), personGenders: new Map() });
  const { getViewport, fitView } = useReactFlow();
  const [treeName, setTreeName] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    /** the actual person clicked (differs from nodeId inside a couple node) */
    personId?: string | null;
    nodeType?: string;
    x: number;
    y: number;
  } | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editName2, setEditName2] = useState(''); // for couple second person
  const [editIsCouple, setEditIsCouple] = useState(false);
  const [editPerson1Id, setEditPerson1Id] = useState<number>(0);
  const [editPerson2Id, setEditPerson2Id] = useState<number>(0);
  const [editGender1, setEditGender1] = useState('');
  const [editGender2, setEditGender2] = useState('');
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Person form modal
  const [formModal, setFormModal] = useState<{
    mode: 'addFirst' | 'addRoot' | 'addRelation';
    relationType?: string;
    targetNodeId?: string;
  } | null>(null);
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState('');
  const [formBirth, setFormBirth] = useState<DateEdit>(EMPTY_DATE);
  const [formDeath, setFormDeath] = useState<DateEdit>(EMPTY_DATE);
  const [editBirth, setEditBirth] = useState<DateEdit>(EMPTY_DATE);
  const [editBirth2, setEditBirth2] = useState<DateEdit>(EMPTY_DATE);
  const [editDeath, setEditDeath] = useState<DateEdit>(EMPTY_DATE);
  const [editDeath2, setEditDeath2] = useState<DateEdit>(EMPTY_DATE);
  const [showShareModal, setShowShareModal] = useState(false);

  // Link existing person modal
  const [linkModal, setLinkModal] = useState<{
    targetNodeId: string;
    targetName: string;
    persons: { id: number; name: string }[];
  } | null>(null);

  // Confirm and toast state
  const [confirmAction, setConfirmAction] = useState<{
    title: string; message: string; danger?: boolean; onConfirm: () => void;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'error' | 'success' | 'info' } | null>(null);

  // Crop modal state
  const [cropModal, setCropModal] = useState<{
    imageUrl: string;
    personId: number;
  } | null>(null);

  const startUpload = (personId: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        setToast({ message: t.fileTooLarge });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCropModal({ imageUrl: reader.result as string, personId });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleCroppedUpload = async (blob: Blob, personId: number) => {
    setCropModal(null);
    try {
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      await ds.uploadPhoto(personId, file);
      loadGraph();
      setToast({ message: t.photoUploaded, type: 'success' });
    } catch {
      setToast({ message: t.uploadFailed });
    }
  };

  // ── layout: automatic order + hand-dragged positions ──────────────────
  // Saved positions are merged over the automatic layout, so a refresh keeps
  // whatever the user arranged by hand while everything they never moved
  // still follows the automatic order.
  const [layoutOrder, setLayoutOrder] = useState<'age-desc' | 'age-asc'>('age-desc');
  const [savedPositions, setSavedPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [birthdayMenuOpen, setBirthdayMenuOpen] = useState(false);
  const savedPositionsRef = useRef(savedPositions);
  savedPositionsRef.current = savedPositions;

  // Birthdays in the next 30 days. Couple nodes carry two people, both of
  // whom may have a date; anyone without a FULL date is skipped inside.
  const upcoming = useMemo(() => {
    const people: BirthdayPerson[] = [];
    for (const n of nodes) {
      const d = n.data as any;
      if (d?.person1) {
        for (const half of [d.person1, d.person2]) {
          if (half?.id != null) {
            people.push({
              id: Number(half.id),
              name: half.name,
              birthDate: half.birthDate,
              birthPrecision: half.birthPrecision,
            });
          }
        }
      } else if (d?.id != null || n.id) {
        people.push({
          id: Number(d?.personId ?? n.id),
          name: String(d?.name ?? ''),
          birthDate: d?.birthDate,
          birthPrecision: d?.birthPrecision,
        });
      }
    }
    return upcomingBirthdays(people, 30);
  }, [nodes]);

  const loadGraph = useCallback(async () => {
    try {
      const tree = await ds.getTree();
      setTreeName(tree.name);
      setShareCode(tree.shareCode || '');
      const graph = await ds.getGraph();

      // Build nodes/edges (couples, polygamy, child links) + auto layout
      const built = buildFamilyGraph(graph);
      setGraphInfo({ parentsByPerson: built.parentsByPerson, personGenders: built.personGenders });
      const treeOrder = (graph.layoutOrder as 'age-desc' | 'age-asc') || 'age-desc';
      const saved = graph.nodePositions || {};
      setLayoutOrder(treeOrder);
      setSavedPositions(saved);
      savedPositionsRef.current = saved;
      const laidOut = layoutFamilyGraph(built.nodes, built.edges, {
        order: treeOrder,
        saved,
      });
      setNodes(laidOut);
      setEdges(built.edges);
      // Re-fit the view so the whole tree stays on screen after any change
      // (especially polygamous families, which grow sideways).
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 60);
    } catch {
      // A guest tree always exists locally — only a missing saved tree redirects.
      if (!isGuest) navigate('/trees');
    } finally {
      setLoading(false);
    }
  }, [ds, isGuest, navigate, setNodes, setEdges]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  /** Re-run the layout with a new sibling order (persisted server-side). */
  const changeLayoutOrder = useCallback(
    async (next: 'age-desc' | 'age-asc') => {
      if (next === layoutOrder) return;
      setLayoutOrder(next);
      const graph = await ds.getGraph();
      const rebuilt = buildFamilyGraph(graph);
      setNodes(
        layoutFamilyGraph(rebuilt.nodes, rebuilt.edges, {
          order: next,
          saved: savedPositionsRef.current,
        }),
      );
      setEdges(rebuilt.edges);
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 60);
      try {
        await ds.updateLayout({ layoutOrder: next });
        setToast({ message: t.layoutSaved });
      } catch {
        setToast({ message: t.layoutSaveFailed });
      }
    },
    [ds, layoutOrder, setNodes, setEdges, fitView, t],
  );

  /** Throw away every hand-dragged position and go back to the auto layout. */
  const resetLayout = useCallback(async () => {
    savedPositionsRef.current = {};
    setSavedPositions({});
    const graph = await ds.getGraph();
    const rebuilt = buildFamilyGraph(graph);
    setNodes(
      layoutFamilyGraph(rebuilt.nodes, rebuilt.edges, {
        order: layoutOrder,
        saved: {},
      }),
    );
    setEdges(rebuilt.edges);
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 60);
    try {
      await ds.updateLayout({ nodePositions: {} });
      setToast({ message: t.layoutReset });
    } catch {
      setToast({ message: t.layoutSaveFailed });
    }
  }, [ds, layoutOrder, setNodes, setEdges, fitView, t]);

  /** Remember where the user dropped a node so a refresh keeps it there. */
  const onNodeDragStop = useCallback(
    (_evt: any, node: any) => {
      const key = nodeKey(node);
      const next = {
        ...savedPositionsRef.current,
        [key]: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
      };
      savedPositionsRef.current = next;
      setSavedPositions(next);
      ds.updateLayout({ nodePositions: next }).catch(() => {
        setToast({ message: t.layoutSaveFailed });
      });
    },
    [ds, t],
  );

  const deletePerson = useCallback(
    async (nodeId: string) => {
      // Resolve couple node to its two underlying persons
      const personIds = resolveDeletePersonIds(nodeId, nodes);
      if (personIds.length === 0) return;

      setConfirmAction({
        title: '🗑️ ' + (t.deletePersonConfirm?.split('?')[0] || ''),
        message: personIds.length > 1 ? t.deleteCoupleConfirm || t.deletePersonConfirm : t.deletePersonConfirm,
        danger: true,
        onConfirm: async () => {
          setConfirmAction(null);
          try {
            // Single call — the store cascades to children & grandchildren
            if (personIds.length === 1) {
              await ds.deletePerson(personIds[0]);
            } else {
              await ds.batchDelete(personIds);
            }
            loadGraph();
          } catch (err: any) {
            setToast({ message: err.response?.data?.message || t.failed });
          }
        },
      });
    },
    [ds, loadGraph, nodes, t],
  );

  const renamePerson = useCallback(
    async (nodeId: string, newName: string, newName2?: string) => {
      const name1 = stripDigits(newName.trim());
      const name2 = newName2 ? stripDigits(newName2.trim()) : '';
      // Validate names before saving
      if (!name1 || !isValidName(name1)) {
        setToast({ message: t.nameInvalidChars });
        return;
      }
      if (nodeId.startsWith('couple-') && newName2?.trim() && (!name2 || !isValidName(name2))) {
        setToast({ message: t.nameInvalidChars });
        return;
      }
      // Both dates for each person: the clicked half (1) and, in a couple, the other half (2)
      const d1 = { ...dateToApi(editBirth, 'birth'), ...dateToApi(editDeath, 'death') };
      const d2 = { ...dateToApi(editBirth2, 'birth'), ...dateToApi(editDeath2, 'death') };
      try {
        if (nodeId.startsWith('couple-')) {
          // Update both persons in the couple (name + gender + birth date)
          if (name1) {
            await ds.updatePerson(editPerson1Id, { name: name1, gender: editGender1 || undefined, ...d1 });
          }
          if (name2 && editPerson2Id) {
            await ds.updatePerson(editPerson2Id, { name: name2, gender: editGender2 || undefined, ...d2 });
          }
        } else {
          await ds.updatePerson(Number(nodeId), { name: name1, gender: editGender1 || undefined, ...d1 });
        }
        setEditingNode(null);
        loadGraph();
      } catch (err: any) {
        setToast({ message: err.response?.data?.message || t.failed });
      }
    },
    [ds, loadGraph, t, editPerson1Id, editPerson2Id, editGender1, editGender2,
     editBirth, editBirth2, editDeath, editDeath2],
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // In a merged couple node we must know WHICH of the two people was
      // clicked — the menu rules differ per person (e.g. husband vs wife).
      let personId: string | null = null;
      if (node.type === 'coupleNode') {
        const half = (event.target as HTMLElement)?.closest?.('[data-person-id]');
        personId = half?.getAttribute('data-person-id') || null;
        if (!personId) {
          // Fallback: decide by click position (works in RTL too)
          const d = node.data as any;
          const rect = document
            .querySelector(`.react-flow__node[data-id="${node.id}"]`)
            ?.getBoundingClientRect();
          if (rect) {
            const first = rect.left + rect.width / 4;
            const second = rect.left + (rect.width * 3) / 4;
            personId = String(
              Math.abs(event.clientX - first) <= Math.abs(event.clientX - second)
                ? d?.person1?.id
                : d?.person2?.id,
            );
          }
        }
      } else {
        personId = node.id;
      }

      setContextMenu({
        nodeId: node.id,
        personId,
        nodeType: node.type || 'personNode',
        x: Math.min(event.clientX, window.innerWidth - 200),
        y: Math.min(event.clientY, window.innerHeight - 300),
      });
    },
    [],
  );

  const addFirstPerson = () => {
    setFormName('');
    setFormGender('');
    setFormBirth(EMPTY_DATE);
    setFormDeath(EMPTY_DATE);
    setFormModal({ mode: 'addFirst' });
  };

  const addRootPerson = () => {
    setFormName('');
    setFormGender('');
    setFormBirth(EMPTY_DATE);
    setFormDeath(EMPTY_DATE);
    setFormModal({ mode: 'addRoot' });
  };

  const openAddRelationModal = (type: string, targetNodeId: string) => {
    setFormName('');
    setFormGender('');
    setFormBirth(EMPTY_DATE);
    setFormDeath(EMPTY_DATE);
    setFormModal({ mode: 'addRelation', relationType: type, targetNodeId });
  };

  // Build the list of other people in the tree for linking
  const openLinkModal = (targetNodeId: string) => {
    const targetPersonId = resolvePersonId(targetNodeId);
    let targetName = '';
    const seen = new Set<number>();
    const persons: { id: number; name: string }[] = [];
    nodes.forEach((n) => {
      const d = n.data as any;
      const entries: [number, string][] = [];
      if (n.type === 'coupleNode') {
        if (d?.person1?.id) entries.push([Number(d.person1.id), d.person1.name || '']);
        if (d?.person2?.id) entries.push([Number(d.person2.id), d.person2.name || '']);
      } else {
        entries.push([Number(n.id), d?.name || '']);
      }
      entries.forEach(([id, name]) => {
        if (id === targetPersonId && !targetName) targetName = name;
        if (id !== targetPersonId && !seen.has(id)) {
          seen.add(id);
          persons.push({ id, name });
        }
      });
    });
    setLinkModal({ targetNodeId, targetName, persons });
  };

  const confirmLink = async (personId: number, relationType: string) => {
    if (!linkModal) return;
    const targetNodeId = linkModal.targetNodeId;
    const targetPersonId = resolvePersonId(targetNodeId);

    let fromId = personId; // selected person from the list
    let toId = targetPersonId; // the person that was right-clicked
    let relType = relationType;

    if (relationType === 'child') {
      // Selected person becomes the CHILD of the right-clicked person
      fromId = personId;
      toId = targetPersonId;
      relType = 'child';
    } else if (relationType === 'parent') {
      // Selected person becomes the PARENT of the right-clicked person
      fromId = personId;
      toId = targetPersonId;
      relType = 'parent';
    } else if (relationType === 'sibling') {
      // The target becomes a sibling of the SELECTED person by sharing that
      // person's parents. Read from the raw relationships so a person inside
      // a merged couple node is handled correctly.
      const parentIds = parentsOfPerson(personId);
      if (parentIds.length === 0) {
        setToast({ message: t.noParentFound });
        setLinkModal(null);
        return;
      }
      // Link the target person as a child of every parent (inherits all parents)
      for (const parentId of parentIds) {
        await ds.createRelationship({
          fromPersonId: targetPersonId,
          toPersonId: parentId,
          type: 'child',
        });
      }
      setLinkModal(null);
      loadGraph();
      setToast({ message: t.relationAdded, type: 'success' });
      return;
    }

    try {
      await ds.createRelationship({ fromPersonId: fromId, toPersonId: toId, type: relType });
      // An existing person linked as a child also gets the other parent
      if (relType === 'child') {
        await linkOtherParent(fromId, targetPersonId);
      }
      setLinkModal(null);
      loadGraph();
      setToast({ message: t.relationAdded, type: 'success' });
    } catch (err: any) {
      setToast({
        message: translateServerError(err.response?.data?.message || t.failed),
      });
    }
  };

  // Resolve a node ID (may be couple-0 etc) to a real person ID
  const resolvePersonId = (nodeId: string): number => {
    if (nodeId.startsWith('couple-')) {
      // Find the couple node and use the first person's ID
      const coupleNode = nodes.find((n) => n.id === nodeId);
      if (coupleNode) {
        const d = coupleNode.data as any;
        return Number(d.person1?.id || d.person2?.id);
      }
    }
    return Number(nodeId);
  };

  // All known spouses of a person — from spouse edges (polygamous families)
  // and from the merged couple node (monogamous couples).
  const spousesOfPerson = (personId: number): number[] => {
    const ids = new Set<number>();
    edges.forEach((e) => {
      if ((e.data as any)?.type !== 'spouse') return;
      const s = resolvePersonId(e.source);
      const t = resolvePersonId(e.target);
      if (s === personId) ids.add(t);
      if (t === personId) ids.add(s);
    });
    nodes.forEach((n) => {
      if (n.type !== 'coupleNode') return;
      const d = n.data as any;
      const p1 = Number(d?.person1?.id);
      const p2 = Number(d?.person2?.id);
      if (p1 === personId && p2) ids.add(p2);
      if (p2 === personId && p1) ids.add(p1);
    });
    return [...ids].filter((x) => Number.isFinite(x) && x > 0);
  };

  // A child added under one spouse is normally also the child of that
  // person's spouse. Record the second link automatically — otherwise the
  // child would show only one parent and "Add Parent" would stay open.
  // Skipped when the parent has several spouses (polygamy: the other parent
  // is genuinely unknown) or none.
  const linkOtherParent = async (childId: number, parentId: number) => {
    const spouses = spousesOfPerson(parentId);
    if (spouses.length !== 1) return;
    try {
      await ds.createRelationship({
        fromPersonId: childId,
        toPersonId: spouses[0],
        type: 'child',
      });
    } catch {
      // best effort — the primary link is already there
    }
  };

  // Person ids of every known parent of a person. Read from the RAW
  // relationships (keyed by person) because inside a merged couple node the
  // rendered edges can no longer tell which parent belongs to which person.
  const parentsOfPerson = (personId: number): number[] =>
    (graphInfo.parentsByPerson.get(String(personId)) || [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);

  // Adding a PARENT works the same way round: when the new parent has exactly
  // one spouse, that spouse is the child's other parent (e.g. adding محمود as
  // هدى's father also records مهديه as her mother).
  const linkParentSpouse = async (childId: number, parentId: number) => {
    const spouses = spousesOfPerson(parentId);
    if (spouses.length !== 1) return;
    try {
      await ds.createRelationship({
        fromPersonId: childId,
        toPersonId: spouses[0],
        type: 'child',
      });
    } catch {
      // best effort
    }
  };

  // Map known server error messages to localized text
  const translateServerError = useCallback(
    (msg: string): string => {
      if (!msg) return t.failed;
      const map: Record<string, string> = {
        'This person already has a father': t.hasFather,
        'This person already has a mother': t.hasMother,
        'This person already has two fathers': t.hasTwoFathers,
        'This person already has two mothers': t.hasTwoMothers,
        'This person already has a spouse': t.hasSpouse,
      };
      return map[msg] || msg;
    },
    [t],
  );

  const handleFormConfirm = async () => {
    if (!formModal || !formName.trim()) return;
    const mode = formModal.mode;
    const name = formName.trim();
    const gender = formGender;

    try {
      const newPerson = await ds.createPerson({
        name,
        gender,
        ...dateToApi(formBirth, 'birth'),
        ...dateToApi(formDeath, 'death'),
      });

      if (mode === 'addRelation' && formModal.targetNodeId && formModal.relationType) {
        const type = formModal.relationType;
        const targetNodeId = formModal.targetNodeId;
        const targetPersonId = resolvePersonId(targetNodeId);

        const links: { fromPersonId: number; toPersonId: number; type: string }[] = [];

        if (type === 'parent') {
          links.push({ fromPersonId: newPerson.id, toPersonId: targetPersonId, type: 'parent' });
        } else if (type === 'sibling') {
          // A sibling shares the clicked person's parents — a couple node
          // contributes both of its people, and the lookup must use the raw
          // relationships so a person inside a couple node is not missed.
          const parents = parentsOfPerson(targetPersonId);
          if (parents.length === 0) {
            setToast({ message: t.noParentFound });
            await ds.deletePerson(newPerson.id);
            setFormModal(null);
            return;
          }
          parents.forEach((parentPersonId) => {
            links.push({ fromPersonId: newPerson.id, toPersonId: parentPersonId, type: 'child' });
          });
        } else if (type === 'spouse') {
          links.push({ fromPersonId: targetPersonId, toPersonId: newPerson.id, type: 'spouse' });
        } else if (type === 'child') {
          links.push({ fromPersonId: newPerson.id, toPersonId: targetPersonId, type: 'child' });
        }

        for (const link of links) {
          await ds.createRelationship(link);
        }
        // Keep both parents in sync, whichever end was added
        if (type === 'child') await linkOtherParent(newPerson.id, targetPersonId);
        if (type === 'parent') await linkParentSpouse(newPerson.id, targetPersonId);
      }

      setFormModal(null);
      loadGraph();
    } catch (err: any) {
      setToast({
        message: translateServerError(err.response?.data?.message || t.failed),
      });
    }
  };

  const getFormTitle = () => {
    if (!formModal) return '';
    if (formModal.mode === 'addFirst') return t.addYourself;
    if (formModal.mode === 'addRoot') return t.addPerson;
    return `${t.add} ${formModal.relationType}`;
  };

  const isEmpty = !loading && nodes.length === 0;

  // The exact PERSON the menu was opened on. Inside a merged couple node
  // this is the half that was clicked — so the husband and the wife get
  // different rules (e.g. حسن vs هدى).
  const clickedPersonId = contextMenu?.personId || contextMenu?.nodeId || '';
  const clickedNode = contextMenu
    ? nodes.find((n) => n.id === contextMenu.nodeId)
    : undefined;
  const clickedGender = (() => {
    if (!contextMenu) return '';
    if (clickedNode?.type === 'coupleNode') {
      const d = clickedNode.data as any;
      if (String(d?.person1?.id) === clickedPersonId) return d?.person1?.gender || '';
      if (String(d?.person2?.id) === clickedPersonId) return d?.person2?.gender || '';
    }
    return ((clickedNode?.data as any)?.gender as string) || '';
  })();

  // Can the clicked PERSON take another spouse?
  // A woman may have only one husband at a time; a man may take more than
  // one wife (polygamy), so "Add Spouse" is only locked for married women.
  const spouseRule = (() => {
    if (!contextMenu) return { disabled: false, hint: '' };
    const personId = Number(clickedPersonId);
    if (!personId) return { disabled: false, hint: '' };
    const married = spousesOfPerson(personId).length > 0;
    return married && clickedGender !== 'male'
      ? { disabled: true, hint: t.spouseAlreadyMarried }
      : { disabled: false, hint: '' };
  })();

  // Can the clicked PERSON still gain a parent?
  // A person may have at most one father and one mother, so once both are
  // known the "Add Parent" item is locked.
  const parentRule = (() => {
    if (!contextMenu) return { disabled: false, hint: '' };
    const parentIds = graphInfo.parentsByPerson.get(clickedPersonId) || [];
    if (parentIds.length === 0) return { disabled: false, hint: '' };

    const genders = parentIds.map((pid) => graphInfo.personGenders.get(pid) || '');
    const hasFather = genders.includes('male');
    const hasMother = genders.includes('female');

    if (hasFather && hasMother) return { disabled: true, hint: t.parentsComplete };
    if (hasFather) return { disabled: false, hint: t.onlyMotherCanBeAdded };
    if (hasMother) return { disabled: false, hint: t.onlyFatherCanBeAdded };
    return { disabled: false, hint: '' };
  })();

  const handlePrint = async () => {
    // Export ONLY the tree (no navbar/toolbar/minimap), at high quality.
    // Captures the whole tree even if it extends beyond the visible viewport.
    const wrapper = reactFlowWrapper.current;
    const flowEl = wrapper?.querySelector<HTMLElement>('.react-flow');
    if (!flowEl || nodes.length === 0) return;
    try {
      // Bounds of the tree in flow coordinates
      const bounds = getNodesBounds(nodes);
      if (bounds.width === 0 || bounds.height === 0) {
        setToast({ message: t.printFailed });
        return;
      }
      const viewport = getViewport();
      const PAD = 60; // px padding around the tree in output
      const PIXEL_RATIO = 3; // high quality export

      // Convert flow bounds → screen coordinates using current viewport
      const screenX = bounds.x * viewport.zoom + viewport.x;
      const screenY = bounds.y * viewport.zoom + viewport.y;
      const screenW = bounds.width * viewport.zoom;
      const screenH = bounds.height * viewport.zoom;

      // Render the whole React Flow element (includes everything currently visible)
      const canvas = await toCanvas(flowEl, {
        backgroundColor: '#111827',
        pixelRatio: PIXEL_RATIO,
        filter: (node) => {
          // Skip UI overlays that are NOT part of the tree
          const cls = node.classList;
          if (!cls) return true;
          return !(
            cls.contains('react-flow__minimap') ||
            cls.contains('react-flow__panel') ||
            cls.contains('react-flow__controls') ||
            cls.contains('react-flow__attribution')
          );
        },
      });

      // Crop the canvas to exactly the tree bounds (+ padding)
      const cropW = Math.round((screenW + PAD * 2) * PIXEL_RATIO);
      const cropH = Math.round((screenH + PAD * 2) * PIXEL_RATIO);
      const out = document.createElement('canvas');
      out.width = cropW;
      out.height = cropH;
      const ctx = out.getContext('2d');
      if (!ctx) {
        setToast({ message: t.printFailed });
        return;
      }
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, cropW, cropH);
      ctx.drawImage(
        canvas,
        Math.round((screenX - PAD) * PIXEL_RATIO),
        Math.round((screenY - PAD) * PIXEL_RATIO),
        cropW,
        cropH,
        0,
        0,
        cropW,
        cropH,
      );

      const dataUrl = out.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${treeName || 'family-tree'}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setToast({ message: t.printFailed });
    }
  };

  const handleCopyShareLink = () => {
    setShowShareModal(true);
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-x-hidden">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm px-2 sm:px-4 py-2 flex items-center justify-between z-10 gap-1">
        <div className="flex items-center gap-1 sm:gap-4 min-w-0">
          <button
            onClick={() => navigate(isGuest ? '/' : '/trees')}
            className="text-gray-400 hover:text-white transition text-xs sm:text-sm whitespace-nowrap"
          >
            {t.back}
          </button>
          <h1 className="text-sm sm:text-lg font-semibold text-white truncate max-w-[120px] sm:max-w-none">{treeName || t.loading}</h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {!isEmpty && (
            <>
              <button onClick={toggleLang} className="text-[10px] sm:text-xs text-gray-500 hover:text-emerald-400 transition px-1 sm:px-2 whitespace-nowrap">
                {t.langSwitch}
              </button>
              <button onClick={handlePrint}
                className="px-1.5 sm:px-3 py-1 text-[10px] sm:text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition whitespace-nowrap">
                {t.print}
              </button>
              {/* A guest tree has no share code yet — sharing arrives with the account */}
              {!isGuest && (
                <button onClick={handleCopyShareLink}
                  className="px-1.5 sm:px-3 py-1 text-[10px] sm:text-xs bg-emerald-700 hover:bg-emerald-600 text-emerald-200 rounded-lg transition whitespace-nowrap">
                  {t.share}
                </button>
              )}
            </>
          )}
          {isGuest ? (
            <button
              onClick={() => navigate('/register?from=guest')}
              className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition whitespace-nowrap"
            >
              💾 {t.guestSave}
            </button>
          ) : (
            <UserMenu />
          )}
        </div>
      </nav>

      {/* Guest banner */}
      {isGuest && (
        <div className="bg-emerald-950/50 border-b border-emerald-800/40 px-3 py-1.5 text-center text-[10px] sm:text-xs text-emerald-300">
          👋 {t.guestBanner}
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-6xl">🌳</div>
            <h2 className="text-2xl font-bold text-white">{t.emptyTitle}</h2>
            <p className="text-gray-400 text-center max-w-md">
              {t.emptyDesc}
            </p>
            <button
              onClick={addFirstPerson}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-lg transition-all shadow-lg hover:shadow-emerald-500/25 hover:scale-105"
            >
              {t.addFirstPerson}
            </button>
          </div>
        ) : (
          <>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onNodeDragStop={onNodeDragStop}
              onPaneClick={() => setContextMenu(null)}
              nodeTypes={nodeTypes}
              fitView
              selectionMode={SelectionMode.Partial}
              defaultEdgeOptions={{
                type: 'smoothstep',
                style: { stroke: '#6b7280', strokeWidth: 2 },
              }}
            >
              <Background color="#374151" gap={20} />
              <MiniMap
                className="!bg-gray-800 !border-gray-700 hidden md:block"
                nodeColor={(n) => (n.data?.gender === 'female' ? '#ec4899' : '#3b82f6')}
              />
            </ReactFlow>

            {/* View Toolbar */}
            <TreeToolbar wrapperRef={reactFlowWrapper} />

            {/* Layout controls — sibling order + back to auto arrangement.
                A custom dropdown (not a native <select>): the browser paints
                option lists with system colours, which left the unselected
                entry barely visible on the dark UI. */}
            <div className="absolute top-24 sm:top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 sm:gap-2 max-w-[calc(100%-1.5rem)] sm:max-w-[60%]">
              <div className="relative">
                <button
                  onClick={() => setLayoutMenuOpen((v) => !v)}
                  className="flex items-center gap-1 sm:gap-1.5 bg-gray-800/95 hover:bg-gray-700 border border-gray-600 rounded-lg px-2 sm:px-2.5 py-1.5 shadow-lg transition whitespace-nowrap"
                  aria-haspopup="listbox"
                  aria-expanded={layoutMenuOpen}
                >
                  <span className="text-sm leading-none">🔀</span>
                  <span className="hidden sm:inline text-[11px] text-gray-400">{t.layoutTitle}</span>
                  <span className="text-[11px] sm:text-xs text-gray-100 font-medium">
                    {layoutOrder === 'age-desc' ? t.layoutAgeDesc : t.layoutAgeAsc}
                  </span>
                  <span className="text-gray-400 text-[9px] leading-none">▼</span>
                </button>

                {layoutMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setLayoutMenuOpen(false)} />
                    <div
                      role="listbox"
                      className="fixed sm:absolute top-[204px] sm:top-full left-0 right-0 mx-auto sm:left-0 sm:right-auto sm:mx-0 sm:mt-1 z-30 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl overflow-hidden min-w-[180px] max-w-[calc(100vw-1.5rem)]"
                    >
                      {(['age-desc', 'age-asc'] as const).map((v) => {
                        const active = layoutOrder === v;
                        return (
                          <button
                            key={v}
                            role="option"
                            aria-selected={active}
                            onClick={() => {
                              changeLayoutOrder(v);
                              setLayoutMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 text-start px-3 py-2 text-xs transition ${
                              active
                                ? 'bg-emerald-600/25 text-emerald-100 font-semibold'
                                : 'text-gray-100 hover:bg-gray-700'
                            }`}
                          >
                            <span className="w-3.5 text-emerald-400">{active ? '✓' : ''}</span>
                            {v === 'age-desc' ? t.layoutAgeDesc : t.layoutAgeAsc}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={resetLayout}
                title={t.layoutResetBtn}
                aria-label={t.layoutResetBtn}
                className="flex items-center gap-1 bg-gray-800/95 hover:bg-gray-700 border border-gray-600 text-gray-100 text-[11px] sm:text-xs rounded-lg px-2 sm:px-2.5 py-1.5 shadow-lg transition whitespace-nowrap"
              >
                <span className="text-sm leading-none">🔄</span>
                <span className="hidden sm:inline">{t.layoutResetBtn}</span>
              </button>

              {/* Upcoming birthdays — 🎂 badge + the list */}
              <div className="relative">
                <button
                  onClick={() => setBirthdayMenuOpen((v) => !v)}
                  title={t.birthdayTooltip}
                  aria-haspopup="dialog"
                  aria-expanded={birthdayMenuOpen}
                  className={`flex items-center gap-1 sm:gap-1.5 border rounded-lg px-2 sm:px-2.5 py-1.5 shadow-lg transition ${
                    upcoming.length > 0
                      ? 'bg-pink-600/25 hover:bg-pink-600/35 border-pink-500/60 text-pink-100'
                      : 'bg-gray-800/95 hover:bg-gray-700 border-gray-600 text-gray-400'
                  }`}
                >
                  <span className="text-sm leading-none">🎂</span>
                  <span className="text-xs font-semibold">{upcoming.length}</span>
                </button>

                {birthdayMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setBirthdayMenuOpen(false)} />
                    <div className="fixed sm:absolute top-[204px] sm:top-full left-0 right-0 mx-auto sm:left-auto sm:right-auto sm:mx-0 sm:mt-1 sm:start-0 sm:end-auto z-30 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl overflow-hidden w-[270px] max-w-[calc(100vw-1.5rem)]">
                      <div className="px-3 py-2 border-b border-gray-700 text-[11px] text-gray-400 font-medium">
                        {t.birthdayTitle}
                      </div>
                      {upcoming.length === 0 ? (
                        <div className="px-3 py-4 text-center text-xs text-gray-400">
                          {t.birthdayNone}
                        </div>
                      ) : (
                        <div className="max-h-[300px] overflow-y-auto">
                          {upcoming.map((b) => (
                            <div
                              key={b.personId}
                              className="px-3 py-2 border-b border-gray-700/50 last:border-0"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-gray-100 font-medium truncate">
                                  {b.name}
                                </span>
                                <span
                                  className={`text-[11px] shrink-0 ${
                                    b.daysUntil <= 1 ? 'text-pink-300 font-semibold' : 'text-gray-400'
                                  }`}
                                >
                                  {b.daysUntil === 0
                                    ? t.birthdayToday
                                    : b.daysUntil === 1
                                      ? t.birthdayTomorrow
                                      : t.birthdayInDays.replace('{n}', String(b.daysUntil))}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 mt-1">
                                <span className="text-[10px] text-gray-500">
                                  {formatBirthday(b.next)}
                                  {b.turning
                                    ? ' · ' + t.birthdayTurning.replace('{n}', String(b.turning))
                                    : ''}
                                </span>
                                <a
                                  href={whatsappGreeting(b.name, lang, b.turning)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-600/40 rounded px-1.5 py-0.5 transition whitespace-nowrap"
                                >
                                  {t.birthdayGreet}
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Floating Add Button */}
            <button
              onClick={addRootPerson}
              className="absolute bottom-4 right-4 w-12 h-12 sm:w-14 sm:h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-xl flex items-center justify-center text-xl sm:text-2xl font-bold transition-all hover:scale-110 hover:shadow-emerald-500/30 z-10"
              title="Add Person"
            >
              +
            </button>

            {/* Context Menu */}
            {contextMenu && (
              <NodeContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                spouseDisabled={spouseRule.disabled}
                spouseHint={spouseRule.hint}
                parentDisabled={parentRule.disabled}
                parentHint={parentRule.hint}
                onAdd={(type) => {
                  // relation actions target the exact person that was clicked
                  openAddRelationModal(type, contextMenu.personId || contextMenu.nodeId);
                  setContextMenu(null);
                }}
                onLink={() => {
                  openLinkModal(contextMenu.personId || contextMenu.nodeId);
                  setContextMenu(null);
                }}
                onEdit={() => {
                  const node = nodes.find((n) => n.id === contextMenu.nodeId);
                  if (node) {
                    if (node.type === 'coupleNode') {
                      const d = node.data as any;
                      setEditPerson1Id(Number(d.person1?.id || 0));
                      setEditPerson2Id(Number(d.person2?.id || 0));
                      setEditName(d.person1?.name || '');
                      setEditName2(d.person2?.name || '');
                      setEditGender1(d.person1?.gender || '');
                      setEditGender2(d.person2?.gender || '');
                      setEditBirth(dateFromApi(d.person1?.birthDate, d.person1?.birthPrecision));
                      setEditBirth2(dateFromApi(d.person2?.birthDate, d.person2?.birthPrecision));
                      setEditDeath(dateFromApi(d.person1?.deathDate, d.person1?.deathPrecision));
                      setEditDeath2(dateFromApi(d.person2?.deathDate, d.person2?.deathPrecision));
                      setEditIsCouple(true);
                    } else {
                      setEditIsCouple(false);
                      setEditName((node.data as any).name || '');
                      setEditName2('');
                      setEditGender1((node.data as any).gender || '');
                      setEditGender2('');
                      setEditBirth(
                        dateFromApi((node.data as any).birthDate, (node.data as any).birthPrecision),
                      );
                      setEditDeath(
                        dateFromApi((node.data as any).deathDate, (node.data as any).deathPrecision),
                      );
                      setEditBirth2(EMPTY_DATE);
                      setEditDeath2(EMPTY_DATE);
                      setEditPerson1Id(Number(node.id));
                      setEditPerson2Id(0);
                    }
                    setEditingNode(contextMenu.nodeId);
                  }
                  setContextMenu(null);
                }}
                onDelete={() => {
                  deletePerson(contextMenu.nodeId);
                  setContextMenu(null);
                }}
                onClose={() => setContextMenu(null)}
              />
            )}

            {/* Edit Name Modal */}
            {editingNode && !editIsCouple && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 sm:p-6 w-[90vw] sm:w-96 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-white font-semibold mb-4">{t.edit}</h3>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') renamePerson(editingNode, editName);
                      if (e.key === 'Escape') setEditingNode(null);
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />

                  {/* Gender selector */}
                  <label className="text-gray-300 text-xs font-medium mb-1.5 block">{t.genderTitle}</label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setEditGender1('male')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-all ${
                        editGender1 === 'male'
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-semibold'
                          : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {t.male}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditGender1('female')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-all ${
                        editGender1 === 'female'
                          ? 'bg-pink-600/30 border-pink-500 text-pink-300 font-semibold'
                          : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {t.female}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-gray-400 hover:text-emerald-400 cursor-pointer transition mb-4"
                    onClick={() => startUpload(editPerson1Id || Number(editingNode))}>
                    <span className="text-xs">{t.uploadPhoto}</span>
                    <span className="text-gray-600 text-[10px] ml-auto">{t.maxFileSize}</span>
                  </div>

                  <DateField kind="birth" value={editBirth} onChange={setEditBirth} />
                  <DateField kind="death" value={editDeath} onChange={setEditDeath} />

                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingNode(null)}
                      className="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition">{t.cancel}</button>
                    <button onClick={() => renamePerson(editingNode, editName)}
                      className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition">{t.save}</button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Couple Modal */}
            {editingNode && editIsCouple && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 sm:p-6 w-[90vw] sm:w-96 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <h3 className="text-white font-semibold mb-1 text-center">{t.editCouple}</h3>
                  <p className="text-gray-400 text-xs text-center mb-4">{t.editCoupleDesc}</p>

                  {/* Person 1 */}
                  <label className="text-gray-300 text-xs font-medium mb-1 block">
                    {editGender1 === 'male' ? t.husband : editGender1 === 'female' ? t.wife : t.person1}
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="text" value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button onClick={() => startUpload(editPerson1Id)}
                      className="px-2.5 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-xs text-gray-400 hover:text-emerald-400 cursor-pointer transition whitespace-nowrap"
                      title="Upload photo">
                      📷
                    </button>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setEditGender1('male')}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        editGender1 === 'male'
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-semibold'
                          : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {t.male}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditGender1('female')}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        editGender1 === 'female'
                          ? 'bg-pink-600/30 border-pink-500 text-pink-300 font-semibold'
                          : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {t.female}
                    </button>
                  </div>

                  <DateField kind="birth" value={editBirth} onChange={setEditBirth} />
                  <DateField kind="death" value={editDeath} onChange={setEditDeath} />

                  {/* Person 2 */}
                  <label className="text-gray-300 text-xs font-medium mb-1 block">
                    {editGender2 === 'male' ? t.husband : editGender2 === 'female' ? t.wife : t.person2}
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="text" value={editName2}
                      onChange={(e) => setEditName2(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button onClick={() => startUpload(editPerson2Id)}
                      className="px-2.5 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-xs text-gray-400 hover:text-emerald-400 cursor-pointer transition whitespace-nowrap"
                      title="Upload photo">
                      📷
                    </button>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setEditGender2('male')}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        editGender2 === 'male'
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-semibold'
                          : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {t.male}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditGender2('female')}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        editGender2 === 'female'
                          ? 'bg-pink-600/30 border-pink-500 text-pink-300 font-semibold'
                          : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {t.female}
                    </button>
                  </div>

                  <DateField kind="birth" value={editBirth2} onChange={setEditBirth2} />
                  <DateField kind="death" value={editDeath2} onChange={setEditDeath2} />

                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingNode(null)}
                      className="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition">{t.cancel}</button>
                    <button onClick={() => renamePerson(editingNode, editName, editName2)}
                      className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition">{t.save}</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Person Form Modal */}
      {formModal && (
        <PersonFormModal
          title={getFormTitle()}
          name={formName}
          gender={formGender}
          onNameChange={setFormName}
          onGenderChange={setFormGender}
          birth={formBirth}
          onBirthChange={setFormBirth}
          death={formDeath}
          onDeathChange={setFormDeath}
          onConfirm={handleFormConfirm}
          onCancel={() => setFormModal(null)}
          confirmLabel={formModal.mode === 'addRelation' ? `${t.add} ${formModal.relationType}` : t.add}
        />
      )}

      {/* Link Existing Person Modal */}
      {linkModal && (
        <LinkPersonModal
          title={t.linkPerson.replace(/^[^\s]+\s/, '')}
          targetName={linkModal.targetName}
          persons={linkModal.persons}
          onLink={confirmLink}
          onCancel={() => setLinkModal(null)}
        />
      )}

      {/* Share Modal */}
      {showShareModal && shareCode && (
        <ShareModal
          url={`${window.location.origin}/share/${shareCode}`}
          treeName={treeName}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          danger={confirmAction.danger}
          confirmLabel={t.delete}
          cancelLabel={t.cancel}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type || 'error'}
          onClose={() => setToast(null)}
        />
      )}

      {/* Image Crop Modal */}
      {cropModal && (
        <ImageCropModal
          imageUrl={cropModal.imageUrl}
          onCrop={(blob) => handleCroppedUpload(blob, cropModal.personId)}
          onCancel={() => setCropModal(null)}
        />
      )}
    </div>
  );
}

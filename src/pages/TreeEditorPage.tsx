import { useCallback, useEffect, useState, useRef } from 'react';
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

import { trees, persons, relationships } from '../api/endpoints';
import UserMenu from '../components/UserMenu';
import PersonNode from '../components/PersonNode';
import CoupleNode from '../components/CoupleNode';
import NodeContextMenu from '../components/NodeContextMenu';
import PersonFormModal from '../components/PersonFormModal';
import LinkPersonModal from '../components/LinkPersonModal';
import TreeToolbar from '../components/TreeToolbar';
import ShareModal from '../components/ShareModal';
import ConfirmModal from '../components/ConfirmModal';
import ImageCropModal from '../components/ImageCropModal';
import Toast from '../components/Toast';
import { toCanvas } from 'html-to-image';
import { useI18n } from '../i18n/I18nContext';
import { resolveDeletePersonIds } from '../utils/deleteResolution';
import { buildFamilyGraph, layoutFamilyGraph } from '../utils/familyGraph';
import { isValidName, stripDigits } from '../utils/nameValidation';

const nodeTypes = { personNode: PersonNode, coupleNode: CoupleNode };

export default function TreeEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, toggleLang } = useI18n();
  const treeId = Number(id);

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
      await persons.uploadPhoto(personId, file);
      loadGraph();
      setToast({ message: t.photoUploaded, type: 'success' });
    } catch {
      setToast({ message: t.uploadFailed });
    }
  };

  const loadGraph = useCallback(async () => {
    try {
      const tree = await trees.get(treeId);
      setTreeName(tree.name);
      setShareCode(tree.shareCode || '');
      const graph = await trees.graph(treeId);

      // Build nodes/edges (couples, polygamy, child links) + auto layout
      const built = buildFamilyGraph(graph);
      setGraphInfo({ parentsByPerson: built.parentsByPerson, personGenders: built.personGenders });
      const laidOut = layoutFamilyGraph(built.nodes, built.edges);
      setNodes(laidOut);
      setEdges(built.edges);
      // Re-fit the view so the whole tree stays on screen after any change
      // (especially polygamous families, which grow sideways).
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 60);
    } catch {
      navigate('/trees');
    } finally {
      setLoading(false);
    }
  }, [treeId, navigate, setNodes, setEdges]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

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
            // Single call — server cascades to children & grandchildren
            if (personIds.length === 1) {
              await persons.delete(personIds[0]);
            } else {
              await persons.batchDelete(personIds);
            }
            loadGraph();
          } catch (err: any) {
            setToast({ message: err.response?.data?.message || t.failed });
          }
        },
      });
    },
    [loadGraph, nodes, t],
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
      try {
        if (nodeId.startsWith('couple-')) {
          // Update both persons in the couple (name + gender)
          if (name1) {
            await persons.update(editPerson1Id, { name: name1, gender: editGender1 || undefined });
          }
          if (name2 && editPerson2Id) {
            await persons.update(editPerson2Id, { name: name2, gender: editGender2 || undefined });
          }
        } else {
          await persons.update(Number(nodeId), { name: name1, gender: editGender1 || undefined });
        }
        setEditingNode(null);
        loadGraph();
      } catch (err: any) {
        setToast({ message: err.response?.data?.message || t.failed });
      }
    },
    [loadGraph, t, editPerson1Id, editPerson2Id, editGender1, editGender2],
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
    setFormModal({ mode: 'addFirst' });
  };

  const addRootPerson = () => {
    setFormName('');
    setFormGender('');
    setFormModal({ mode: 'addRoot' });
  };

  const openAddRelationModal = (type: string, targetNodeId: string) => {
    setFormName('');
    setFormGender('');
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
        await relationships.create({
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
      await relationships.create({ fromPersonId: fromId, toPersonId: toId, type: relType });
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
      await relationships.create({
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
      await relationships.create({
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
      const newPerson = await persons.create({ name, treeId, gender });

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
            await persons.delete(newPerson.id);
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
          await relationships.create(link);
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
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm px-2 sm:px-4 py-2 flex items-center justify-between z-10 gap-1">
        <div className="flex items-center gap-1 sm:gap-4 min-w-0">
          <button
            onClick={() => navigate('/trees')}
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
              <button onClick={handleCopyShareLink}
                className="px-1.5 sm:px-3 py-1 text-[10px] sm:text-xs bg-emerald-700 hover:bg-emerald-600 text-emerald-200 rounded-lg transition whitespace-nowrap">
                {t.share}
              </button>
            </>
          )}
          <UserMenu />
        </div>
      </nav>

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
                      setEditIsCouple(true);
                    } else {
                      setEditIsCouple(false);
                      setEditName((node.data as any).name || '');
                      setEditName2('');
                      setEditGender1((node.data as any).gender || '');
                      setEditGender2('');
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
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 sm:p-6 w-[90vw] sm:w-80">
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
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 sm:p-6 w-[90vw] sm:w-96 shadow-2xl">
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

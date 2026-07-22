import { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  SelectionMode,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { trees, persons, relationships } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import PersonNode from '../components/PersonNode';
import CoupleNode from '../components/CoupleNode';
import NodeContextMenu from '../components/NodeContextMenu';
import PersonFormModal from '../components/PersonFormModal';
import ShareModal from '../components/ShareModal';
import { toPng } from 'html-to-image';

const nodeTypes = { personNode: PersonNode, coupleNode: CoupleNode };

// Estimate node width based on type
function getNodeWidth(nodeId: string, nodes: Node[]): number {
  const node = nodes.find((n) => n.id === nodeId);
  if (node?.type === 'coupleNode') return 320;
  return 170; // personNode
}

const MIN_GAP = 40; // min px between node edges
const GENERATION_GAP = 160;

function buildManualLayout(nodes: Node[], edges: Edge[]): Node[] {
  const spouseEdges = edges.filter((e) => e.data?.type === 'spouse');
  const hierarchyEdges = edges.filter((e) => e.data?.type !== 'spouse');

  // Build parent → children adjacency
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();

  for (const e of hierarchyEdges) {
    if (!children.has(e.source)) children.set(e.source, []);
    children.get(e.source)!.push(e.target);
    if (!parents.has(e.target)) parents.set(e.target, []);
    parents.get(e.target)!.push(e.source);
  }

  // BFS to assign levels
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

  // Build tree: for each node, find all its descendant subtrees
  // Position each node centered over its children
  const positioned = new Map<string, { x: number; y: number }>();

  function calcSubtreeWidth(nodeId: string): number {
    const myWidth = getNodeWidth(nodeId, nodes);
    const kidList = children.get(nodeId) || [];
    if (kidList.length === 0) return myWidth;
    const kidWidths = kidList.map((k) => calcSubtreeWidth(k));
    const totalKidSpan = kidWidths.reduce((a, b) => a + b, 0) + (kidList.length - 1) * MIN_GAP;
    return Math.max(myWidth, totalKidSpan);
  }

  function positionNode(nodeId: string, centerX: number, y: number) {
    positioned.set(nodeId, { x: centerX - getNodeWidth(nodeId, nodes) / 2, y });
    const kidList = children.get(nodeId) || [];
    if (kidList.length === 0) return;
    const kidWidths = kidList.map((k) => calcSubtreeWidth(k));
    const totalKidSpan = kidWidths.reduce((a, b) => a + b, 0) + (kidList.length - 1) * MIN_GAP;
    let kidX = centerX - totalKidSpan / 2;
    for (let i = 0; i < kidList.length; i++) {
      const kw = kidWidths[i];
      positionNode(kidList[i], kidX + kw / 2, y + GENERATION_GAP);
      kidX += kw + MIN_GAP;
    }
  }

  // Find roots (level 0) and position them
  const roots = nodes.filter((n) => level.get(n.id) === 0);

  if (roots.length === 1) {
    // Single root: center the whole tree
    positionNode(roots[0].id, 0, 0);
  } else if (roots.length > 1) {
    // Multiple roots: space them out
    let x = -(roots.length * 300) / 2;
    for (const root of roots) {
      positionNode(root.id, x + 150, 0);
      x += 300;
    }
  }

  // Handle orphans (nodes that somehow weren't positioned)
  let maxY = 0;
  for (const [, pos] of positioned) {
    if (pos.y > maxY) maxY = pos.y;
  }
  for (const n of nodes) {
    if (!positioned.has(n.id)) {
      maxY += GENERATION_GAP;
      positioned.set(n.id, { x: 0, y: maxY });
    }
  }

  // Position spouses side-by-side
  for (const e of spouseEdges) {
    const sourcePos = positioned.get(e.source);
    const targetPos = positioned.get(e.target);
    if (sourcePos && targetPos) {
      // Move spouse to the right of their partner
      const sourceWidth = getNodeWidth(e.source, nodes);
      positioned.set(e.target, {
        x: sourcePos.x + sourceWidth + 10,
        y: sourcePos.y,
      });
    }
  }

  return nodes.map((n) => ({
    ...n,
    position: positioned.get(n.id) || { x: 0, y: 0 },
  }));
}

export default function TreeEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const treeId = Number(id);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [treeName, setTreeName] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    nodeType?: string;
    x: number;
    y: number;
  } | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
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

  const loadGraph = useCallback(async () => {
    try {
      const tree = await trees.get(treeId);
      setTreeName(tree.name);
      setShareCode(tree.shareCode || '');
      const graph = await trees.graph(treeId);

      // Find spouse pairs and build couple mapping
      const spouseEdges = graph.edges.filter((e: any) => e.type === 'spouse');
      const coupled = new Set<number>(); // persons already in a couple node
      const coupleMap = new Map<string, { id: string; p1: any; p2: any }>(); // personId -> couple group

      spouseEdges.forEach((se: any, idx: number) => {
        const p1 = graph.nodes.find((n: any) => n.id === se.from);
        const p2 = graph.nodes.find((n: any) => n.id === se.to);
        if (!p1 || !p2) return;
        const coupleId = `couple-${idx}`;
        coupleMap.set(String(se.from), { id: coupleId, p1, p2 });
        coupleMap.set(String(se.to), { id: coupleId, p1, p2 });
        coupled.add(se.from);
        coupled.add(se.to);
      });

      // Create nodes
      const rfNodes: Node[] = [];
      const addedCouples = new Set<string>();

      graph.edges.forEach((e: any) => {
        if (e.type === 'spouse') return;
        // Remap source/target to couple ID if the person is in a couple
        const sourceCouple = coupleMap.get(String(e.from));
        const targetCouple = coupleMap.get(String(e.to));
        const mappedSource = sourceCouple ? sourceCouple.id : String(e.from);
        const mappedTarget = targetCouple ? targetCouple.id : String(e.to);
        // Store remapping info
        e._mappedSource = mappedSource;
        e._mappedTarget = mappedTarget;
      });

      // Create couple nodes
      graph.nodes.forEach((p: any) => {
        if (coupled.has(p.id)) {
          const couple = coupleMap.get(String(p.id));
          if (couple && !addedCouples.has(couple.id)) {
            addedCouples.add(couple.id);
            rfNodes.push({
              id: couple.id,
              type: 'coupleNode',
              position: { x: 0, y: 0 },
              data: {
                person1: { id: String(couple.p1.id), name: couple.p1.name, gender: couple.p1.gender || '' },
                person2: { id: String(couple.p2.id), name: couple.p2.name, gender: couple.p2.gender || '' },
                onClick: () => {},
              },
            });
          }
        } else {
          // Single person node
          rfNodes.push({
            id: String(p.id),
            type: 'personNode',
            position: { x: 0, y: 0 },
            data: {
              name: p.name,
              gender: p.gender,
              onClick: () => {},
            },
          });
        }
      });

      // Create edges
      const rfEdges: Edge[] = graph.edges
        .filter((e: any) => e.type !== 'spouse')
        .map((e: any) => {
          const isChildType = e.type === 'child';
          return {
            id: String(e.id),
            source: isChildType ? e._mappedTarget : e._mappedSource,
            target: isChildType ? e._mappedSource : e._mappedTarget,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#6b7280', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
            data: { type: e.type },
          };
        });

      const laidOut = buildManualLayout(rfNodes, rfEdges);
      setNodes(laidOut);
      setEdges(rfEdges);
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
      if (!confirm('Delete this person and all their connections?')) return;
      try {
        await persons.delete(Number(nodeId));
        loadGraph();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete');
      }
    },
    [loadGraph],
  );

  const renamePerson = useCallback(
    async (nodeId: string, newName: string) => {
      try {
        await persons.update(Number(nodeId), { name: newName });
        setEditingNode(null);
        loadGraph();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to rename');
      }
    },
    [loadGraph],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;
      // For couple nodes, store the couple info so context menu knows
      setContextMenu({
        nodeId: node.id,
        nodeType: node.type || 'personNode',
        x: _.clientX || bounds.left + 100,
        y: _.clientY || bounds.top + 100,
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

        let fromId = targetPersonId;
        let toId = newPerson.id;
        let relType = type;

        if (type === 'parent') {
          fromId = newPerson.id;
          toId = targetPersonId;
          relType = 'parent';
        } else if (type === 'sibling') {
          const parentEdge = edges.find(
            (e) => (e.target === targetNodeId && e.data?.type === 'parent') ||
                   (e.source === targetNodeId && e.data?.type === 'child')
          );
          if (parentEdge) {
            const parentId = resolvePersonId(
              parentEdge.data?.type === 'parent' ? parentEdge.source : parentEdge.target
            );
            fromId = newPerson.id;
            toId = parentId;
            relType = 'child';
          } else {
            alert('No parent found. Add a parent first.');
            await persons.delete(newPerson.id);
            setFormModal(null);
            return;
          }
        } else if (type === 'spouse') {
          relType = 'spouse';
        } else if (type === 'child') {
          fromId = newPerson.id;
          toId = targetPersonId;
          relType = 'child';
        }

        await relationships.create({ fromPersonId: fromId, toPersonId: toId, type: relType });
      }

      setFormModal(null);
      loadGraph();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const getFormTitle = () => {
    if (!formModal) return '';
    if (formModal.mode === 'addFirst') return 'Add Yourself';
    if (formModal.mode === 'addRoot') return 'Add Person';
    return `Add ${formModal.relationType}`;
  };

  const isEmpty = !loading && nodes.length === 0;

  const handlePrint = async () => {
    // Capture the full React Flow wrapper
    const el = reactFlowWrapper.current;
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { backgroundColor: '#111827', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${treeName || 'family-tree'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('Could not generate image. Try taking a screenshot manually.');
    }
  };

  const handleCopyShareLink = () => {
    setShowShareModal(true);
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm px-4 py-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/trees')}
            className="text-gray-400 hover:text-white transition text-sm"
          >
            ← Back
          </button>
          <h1 className="text-lg font-semibold text-white">{treeName || 'Loading...'}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isEmpty && (
            <>
              <button onClick={handlePrint}
                className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition">
                🖨️ Print
              </button>
              <button onClick={handleCopyShareLink}
                className="px-3 py-1 text-xs bg-emerald-700 hover:bg-emerald-600 text-emerald-200 rounded-lg transition">
                🔗 Share
              </button>
            </>
          )}
          <span className="text-gray-500 text-xs ml-2">{user?.email}</span>
          <button onClick={logout} className="text-xs text-gray-500 hover:text-red-400 transition">
            Logout
          </button>
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
            <h2 className="text-2xl font-bold text-white">Your tree is empty</h2>
            <p className="text-gray-400 text-center max-w-md">
              Start building your family tree by adding the first person!
            </p>
            <button
              onClick={addFirstPerson}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-lg transition-all shadow-lg hover:shadow-emerald-500/25 hover:scale-105"
            >
              + Add First Person
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
              <Controls className="!bg-gray-800 !border-gray-700" />
              <MiniMap
                className="!bg-gray-800 !border-gray-700"
                nodeColor={(n) => (n.data?.gender === 'female' ? '#ec4899' : '#3b82f6')}
              />
            </ReactFlow>

            {/* Floating Add Button */}
            <button
              onClick={addRootPerson}
              className="absolute bottom-6 right-6 w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-xl flex items-center justify-center text-2xl font-bold transition-all hover:scale-110 hover:shadow-emerald-500/30 z-10"
              title="Add Person"
            >
              +
            </button>

            {/* Context Menu */}
            {contextMenu && (
              <NodeContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                onAdd={(type) => {
                  openAddRelationModal(type, contextMenu.nodeId);
                  setContextMenu(null);
                }}
                onEdit={() => {
                  const node = nodes.find((n) => n.id === contextMenu.nodeId);
                  if (node) {
                    setEditName((node.data as any).name || '');
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
            {editingNode && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-80">
                  <h3 className="text-white font-semibold mb-4">Edit Name</h3>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') renamePerson(editingNode, editName);
                      if (e.key === 'Escape') setEditingNode(null);
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingNode(null)}
                      className="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => renamePerson(editingNode, editName)}
                      className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition"
                    >
                      Save
                    </button>
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
          confirmLabel={formModal.mode === 'addRelation' ? `Add ${formModal.relationType}` : 'Add'}
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
    </div>
  );
}

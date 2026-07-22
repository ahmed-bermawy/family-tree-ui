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
import NodeContextMenu from '../components/NodeContextMenu';
import PersonFormModal from '../components/PersonFormModal';

const nodeTypes = { personNode: PersonNode };

const SPOUSE_GAP = 180;
const GENERATION_GAP = 160;

function buildManualLayout(nodes: Node[], edges: Edge[]): Node[] {
  const spouseEdges = edges.filter((e) => e.label === 'spouse');
  const hierarchyEdges = edges.filter((e) => e.label !== 'spouse');

  const adjacency = new Map<string, string[]>();
  const parents = new Map<string, string[]>();

  for (const e of hierarchyEdges) {
    // Determine parent and child based on relationship type
    let parentId: string;
    let childId: string;
    if (e.label === 'parent') {
      parentId = e.source;
      childId = e.target;
    } else {
      // 'child' type: source is child, target is parent
      parentId = e.target;
      childId = e.source;
    }

    if (!adjacency.has(parentId)) adjacency.set(parentId, []);
    adjacency.get(parentId)!.push(childId);
    if (!parents.has(childId)) parents.set(childId, []);
    parents.get(childId)!.push(parentId);
  }

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
    const currentLevel = level.get(current) || 0;
    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      const nextLevel = currentLevel + 1;
      if (!level.has(neighbor) || level.get(neighbor)! < nextLevel) {
        level.set(neighbor, nextLevel);
        queue.push(neighbor);
      }
    }
  }

  const byLevel = new Map<number, string[]>();
  for (const [id, lvl] of level) {
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl)!.push(id);
  }

  const positioned = new Map<string, { x: number; y: number }>();
  let maxY = 0;

  for (const [lvl, ids] of byLevel) {
    const y = lvl * GENERATION_GAP;
    const totalWidth = ids.length * SPOUSE_GAP;
    const startX = -totalWidth / 2 + SPOUSE_GAP / 2;
    ids.forEach((id, i) => {
      positioned.set(id, { x: startX + i * SPOUSE_GAP, y });
    });
    maxY = y;
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
      positioned.set(e.target, {
        x: sourcePos.x + SPOUSE_GAP,
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
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
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

  const loadGraph = useCallback(async () => {
    try {
      const tree = await trees.get(treeId);
      setTreeName(tree.name);
      const graph = await trees.graph(treeId);

      const rfNodes: Node[] = graph.nodes.map((p: any) => ({
        id: String(p.id),
        type: 'personNode',
        position: { x: 0, y: 0 },
        data: {
          name: p.name,
          gender: p.gender,
          onClick: () => {},
        },
      }));

      const rfEdges: Edge[] = graph.edges.map((e: any) => ({
        id: String(e.id),
        source: String(e.from),
        target: String(e.to),
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#6b7280', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
        label: e.type,
      }));

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
      if (bounds) {
        setContextMenu({
          nodeId: node.id,
          x: _.clientX || bounds.left + 100,
          y: _.clientY || bounds.top + 100,
        });
      }
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

        let fromId = Number(targetNodeId);
        let toId = newPerson.id;
        let relType = type;

        if (type === 'parent') {
          fromId = newPerson.id;
          toId = Number(targetNodeId);
          relType = 'parent';
        } else if (type === 'sibling') {
          // Find parent of the target node (check both relationship directions)
          const parentEdge = edges.find(
            (e) => (e.target === targetNodeId && e.label === 'parent') ||
                   (e.source === targetNodeId && e.label === 'child')
          );
          if (parentEdge) {
            const parentId = parentEdge.label === 'parent'
              ? Number(parentEdge.source)
              : Number(parentEdge.target);
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
          toId = Number(targetNodeId);
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
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-xs">{user?.email}</span>
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
    </div>
  );
}

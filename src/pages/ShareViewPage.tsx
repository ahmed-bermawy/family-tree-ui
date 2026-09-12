import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import PersonNode from '../components/PersonNode';
import CoupleNode from '../components/CoupleNode';
import { API_BASE } from '../api/client';
import { useI18n } from '../i18n/I18nContext';
import Footer from '../components/Footer';
import { usePageMeta } from '../hooks/usePageMeta';
import { buildFamilyGraph, layoutFamilyGraph } from '../utils/familyGraph';

const nodeTypes = { personNode: PersonNode, coupleNode: CoupleNode };

export default function ShareViewPage() {
  const { id } = useParams<{ id: string }>();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [treeName, setTreeName] = useState('');
  const [personCount, setPersonCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t } = useI18n();

  // SEO: dynamic title/description once the tree loads.
  // Default (while loading) points at the public tree viewer.
  usePageMeta(
    treeName ? `${treeName} — Family Tree` : 'Shared Family Tree — Family Tree',
    treeName
      ? `${treeName}: a family tree with ${personCount} people. View it online for free.`
      : 'View a shared family tree online for free.',
  );

  useEffect(() => {
    fetch(`${API_BASE}/trees/share/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Tree not found');
        return r.json();
      })
      .then((graph) => {
        setTreeName(graph.tree.name);
        setPersonCount(graph.nodes?.length || 0);

        // Build nodes/edges (couples, polygamy, child links) + layout
        const built = buildFamilyGraph(graph);
        const laidOut = layoutFamilyGraph(built.nodes, built.edges);
        setNodes(laidOut);
        setEdges(built.edges);
        setLoading(false);
      })
      .catch(() => {
        setError(t.treeNotFound);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <div className="text-6xl">🔗</div>
        <h1 className="text-2xl font-bold text-white">{error}</h1>
        <Link to="/" className="text-emerald-400 hover:text-emerald-300 transition">
          {t.goHome}
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <nav className="border-b border-gray-800 bg-gray-900/90 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-white">{treeName}</h1>
          <span className="text-xs bg-emerald-600/20 text-emerald-400 px-2 py-0.5 rounded-full">
            {t.sharedView}
          </span>
        </div>
        <Link to="/" className="text-sm text-gray-400 hover:text-white transition">
          {t.buildYourOwn}
        </Link>
      </nav>
      <div className="flex-1 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          panOnDrag
          zoomOnScroll
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background color="#374151" gap={20} />
          <Controls className="!bg-gray-800 !border-gray-700" />
        </ReactFlow>
      </div>
      <Footer />
    </div>
  );
}

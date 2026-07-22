import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ReactFlow, Background, Controls, type Node, type Edge, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import PersonNode from '../components/PersonNode';
import CoupleNode from '../components/CoupleNode';
import { useI18n } from '../i18n/I18nContext';

const nodeTypes = { personNode: PersonNode, coupleNode: CoupleNode };

export default function ShareViewPage() {
  const { id } = useParams<{ id: string }>();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [treeName, setTreeName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t } = useI18n();

  useEffect(() => {
    fetch(`http://76.13.60.23:3000/trees/share/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Tree not found');
        return r.json();
      })
      .then((graph) => {
        setTreeName(graph.tree.name);

        // Group spouses into couples
        const spouseEdges = graph.edges.filter((e: any) => e.type === 'spouse');
        const coupled = new Set<number>();
        const coupleMap = new Map<string, { id: string; p1: any; p2: any }>();
        spouseEdges.forEach((se: any, idx: number) => {
          const p1 = graph.nodes.find((n: any) => n.id === se.from);
          const p2 = graph.nodes.find((n: any) => n.id === se.to);
          if (!p1 || !p2) return;
          const cid = `couple-${idx}`;
          coupleMap.set(String(se.from), { id: cid, p1, p2 });
          coupleMap.set(String(se.to), { id: cid, p1, p2 });
          coupled.add(se.from);
          coupled.add(se.to);
        });

        const rfNodes: Node[] = [];
        const added = new Set<string>();

        graph.edges.forEach((e: any) => {
          if (e.type === 'spouse') return;
          const sc = coupleMap.get(String(e.from));
          const tc = coupleMap.get(String(e.to));
          e._mappedSource = sc ? sc.id : String(e.from);
          e._mappedTarget = tc ? tc.id : String(e.to);
        });

        graph.nodes.forEach((p: any) => {
          if (coupled.has(p.id)) {
            const c = coupleMap.get(String(p.id));
            if (c && !added.has(c.id)) {
              added.add(c.id);
              rfNodes.push({
                id: c.id, type: 'coupleNode', position: { x: 0, y: 0 },
                data: {
                  person1: { id: String(c.p1.id), name: c.p1.name, gender: c.p1.gender || '' },
                  person2: { id: String(c.p2.id), name: c.p2.name, gender: c.p2.gender || '' },
                },
              });
            }
          } else {
            rfNodes.push({
              id: String(p.id), type: 'personNode', position: { x: 0, y: 0 },
              data: { name: p.name, gender: p.gender },
            });
          }
        });

        const rfEdges: Edge[] = graph.edges
          .filter((e: any) => e.type !== 'spouse')
          .map((e: any) => ({
            id: String(e.id),
            source: e.type === 'child' ? e._mappedTarget : e._mappedSource,
            target: e.type === 'child' ? e._mappedSource : e._mappedTarget,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#6b7280', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
          }));

        // Layout
        const spouseEdgesFilter = rfEdges.filter((e) => e.data?.type === 'spouse');
        const hierarchyEdges = rfEdges.filter((e) => e.data?.type !== 'spouse');
        const children = new Map<string, string[]>();
        const parents = new Map<string, string[]>();
        for (const e of hierarchyEdges) {
          if (!children.has(e.source)) children.set(e.source, []);
          children.get(e.source)!.push(e.target);
          if (!parents.has(e.target)) parents.set(e.target, []);
          parents.get(e.target)!.push(e.source);
        }

        const getWidth = (nid: string) => rfNodes.find((n) => n.id === nid)?.type === 'coupleNode' ? 320 : 170;
        const MIN_GAP = 40;
        const GEN_GAP = 160;

        function calcW(nid: string): number {
          const w = getWidth(nid);
          const kids = children.get(nid) || [];
          if (kids.length === 0) return w;
          const kw = kids.map((k) => calcW(k));
          return Math.max(w, kw.reduce((a, b) => a + b, 0) + (kids.length - 1) * MIN_GAP);
        }

        const pos = new Map<string, { x: number; y: number }>();
        function place(nid: string, cx: number, y: number) {
          pos.set(nid, { x: cx - getWidth(nid) / 2, y });
          const kids = children.get(nid) || [];
          if (kids.length === 0) return;
          const kw = kids.map((k) => calcW(k));
          const total = kw.reduce((a, b) => a + b, 0) + (kids.length - 1) * MIN_GAP;
          let kx = cx - total / 2;
          kids.forEach((k, i) => {
            place(k, kx + kw[i] / 2, y + GEN_GAP);
            kx += kw[i] + MIN_GAP;
          });
        }

        const roots = rfNodes.filter((n) => !parents.has(n.id));
        if (roots.length === 1) place(roots[0].id, 0, 0);
        else {
          let x = -(roots.length * 300) / 2;
          roots.forEach((r) => { place(r.id, x + 150, 0); x += 300; });
        }

        // Spouse side-by-side
        for (const e of spouseEdgesFilter) {
          const sp = pos.get(e.source);
          const tp = pos.get(e.target);
          if (sp && tp) {
            pos.set(e.target, { x: sp.x + getWidth(e.source) + 10, y: sp.y });
          }
        }

        setNodes(rfNodes.map((n) => ({ ...n, position: pos.get(n.id) || { x: 0, y: 0 } })));
        setEdges(rfEdges);
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
      <div className="flex-1">
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
    </div>
  );
}

import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { KnowledgeGraphNode } from '../types';

interface KnowledgeGraphProps {
  nodes: KnowledgeGraphNode[];
}

const statusColors: Record<string, { bg: string; border: string }> = {
  mastered: { bg: '#dcfce7', border: '#16a34a' },
  current: { bg: '#fef3c7', border: '#d97706' },
  locked: { bg: '#f3f4f6', border: '#9ca3af' },
};

export function KnowledgeGraph({ nodes: graphNodes }: KnowledgeGraphProps) {
  if (graphNodes.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        Knowledge graph will appear after topic diagnosis
      </div>
    );
  }

  const flowNodes: Node[] = graphNodes.map((node, i) => ({
    id: node.id,
    position: { x: 50, y: i * 80 },
    data: { label: node.label },
    style: {
      background: statusColors[node.status].bg,
      border: `2px solid ${statusColors[node.status].border}`,
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '12px',
    },
  }));

  const flowEdges: Edge[] = graphNodes.flatMap((node) =>
    node.prerequisites.map((prereq) => ({
      id: `${prereq}-${node.id}`,
      source: prereq,
      target: node.id,
      animated: node.status === 'current',
    }))
  );

  return (
    <div className="h-[250px] w-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        fitView
        panOnDrag={false}
        zoomOnScroll={false}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}

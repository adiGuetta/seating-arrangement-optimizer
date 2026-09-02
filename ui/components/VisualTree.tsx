import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Line, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { GuestGroup } from '@/lib/types';

const NODE_W = 140;
const NODE_H = 52;
const H_GAP = 16;
const V_GAP = 60;

interface LayoutNode {
  group: GuestGroup;
  x: number;
  y: number;
  children: LayoutNode[];
  depth: number;
}

interface Props {
  groups: GuestGroup[];
  rootId: string;
  onNodePress: (id: string) => void;
  focusedId?: string;
  maxDepth?: number;
  movingId?: string | null;
  movingSubtreeIds?: Set<string>;
  onMoveStart?: (id: string) => void;
  onMoveDrop?: (targetId: string) => void;
}

// Compute subtree width (leaf = NODE_W, parent = sum of children + gaps)
function subtreeWidth(group: GuestGroup, groups: GuestGroup[], depth: number, maxDepth?: number): number {
  if (maxDepth !== undefined && depth >= maxDepth) return NODE_W;
  const children = groups.filter(g => g.parentId === group.id).sort((a, b) => a.createdAt - b.createdAt);
  if (children.length === 0) return NODE_W;
  const childWidths = children.map(c => subtreeWidth(c, groups, depth + 1, maxDepth));
  return childWidths.reduce((a, b) => a + b, 0) + H_GAP * (children.length - 1);
}

// Build layout tree with x,y positions (root centered at top)
function layoutTree(group: GuestGroup, groups: GuestGroup[], x: number, y: number, depth: number, maxDepth?: number): LayoutNode {
  const children = groups.filter(g => g.parentId === group.id).sort((a, b) => a.createdAt - b.createdAt);

  if (children.length === 0 || (maxDepth !== undefined && depth >= maxDepth)) {
    return { group, x: Math.round(x), y: Math.round(y), children: [], depth };
  }

  const childWidths = children.map(c => subtreeWidth(c, groups, depth + 1, maxDepth));
  const totalW = childWidths.reduce((a, b) => a + b, 0) + H_GAP * (children.length - 1);

  let cx = x - totalW / 2;
  const childNodes: LayoutNode[] = [];
  for (let i = 0; i < children.length; i++) {
    const w = childWidths[i];
    const childX = Math.round(cx + w / 2);
    childNodes.push(layoutTree(children[i], groups, childX, y + NODE_H + V_GAP, depth + 1, maxDepth));
    cx += w + H_GAP;
  }

  return { group, x: Math.round(x), y: Math.round(y), children: childNodes, depth };
}

// Collect all nodes flat for rendering
function flattenNodes(node: LayoutNode): LayoutNode[] {
  return [node, ...node.children.flatMap(flattenNodes)];
}

// Collect all edges (parent→child center connections)
function collectEdges(node: LayoutNode): { x1: number; y1: number; x2: number; y2: number; weight: number }[] {
  const edges: { x1: number; y1: number; x2: number; y2: number; weight: number }[] = [];
  for (const child of node.children) {
    edges.push({
      x1: node.x,
      y1: node.y + NODE_H - 1,
      x2: child.x,
      y2: child.y + 1,
      weight: child.group.edgeWeight,
    });
    edges.push(...collectEdges(child));
  }
  return edges;
}

export function VisualTree({ groups, rootId, onNodePress, focusedId, maxDepth, movingId, movingSubtreeIds, onMoveStart, onMoveDrop }: Props) {
  const root = groups.find(g => g.id === rootId);

  const layout = useMemo(() => {
    if (!root) return null;
    const totalW = subtreeWidth(root, groups, 0, maxDepth);
    const centerX = Math.round(Math.max(totalW / 2, 300));
    return layoutTree(root, groups, centerX, 20, 0, maxDepth);
  }, [groups, rootId, maxDepth]);

  if (!layout) return <Text style={{ padding: Spacing.md, color: Colors.disabled }}>Group not found</Text>;

  const allNodes = flattenNodes(layout);
  const edges = collectEdges(layout);

  // Canvas size
  const canvasW = Math.max(...allNodes.map(n => n.x + NODE_W / 2)) + 40;
  const canvasH = Math.max(...allNodes.map(n => n.y + NODE_H)) + 40;

  const handleNodePress = (id: string, isDropTarget: boolean) => {
    if (isDropTarget && onMoveDrop) onMoveDrop(id);
    else if (!movingId) onNodePress(id);
  };

  return (
    <View style={[styles.canvas, { width: canvasW, height: canvasH }]}>
      <Svg pointerEvents="none" width={canvasW} height={canvasH} style={StyleSheet.absoluteFill}>
        {edges.map((e, i) => (
          <React.Fragment key={i}>
            <Line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke={e.weight > 1 ? Colors.primary : Colors.border}
              strokeWidth={Math.min(e.weight, 4)} />
            {e.weight !== 1 && (
              <SvgText x={(e.x1 + e.x2) / 2 + 8} y={(e.y1 + e.y2) / 2}
                fontSize={9} fill={Colors.textSecondary} textAnchor="start">
                w={e.weight}
              </SvgText>
            )}
          </React.Fragment>
        ))}
      </Svg>
      {allNodes.map(n => {
        const isFocused = n.group.id === focusedId;
        const guestCount = n.group.guests.length;
        const depthColor = n.depth === 0 ? Colors.primary : n.depth === 1 ? Colors.accent : Colors.primaryLight;
        const isMoving = movingId === n.group.id;
        const isDropTarget = !!movingId && !isMoving && !(movingSubtreeIds?.has(n.group.id));
        const isInMovingSubtree = !!movingId && movingSubtreeIds?.has(n.group.id) && !isMoving;

        return (
          <TouchableOpacity
            key={n.group.id}
            style={[
              styles.node,
              { left: n.x - NODE_W / 2, top: n.y },
              isFocused && styles.nodeFocused,
              isMoving && styles.nodeMoving,
              isDropTarget && styles.nodeDropTarget,
              isInMovingSubtree && styles.nodeDimmed,
            ]}
            onPress={() => {
              if (isDropTarget && onMoveDrop) onMoveDrop(n.group.id);
              else if (!movingId) onNodePress(n.group.id);
            }}
            onLongPress={() => onMoveStart?.(n.group.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.dot, { backgroundColor: depthColor }]} />
            <View style={styles.nodeInfo}>
              <Text style={styles.nodeName} numberOfLines={1}>{n.group.name}</Text>
              {guestCount > 0 && (
                <Text style={styles.nodeMeta}>{guestCount} guest{guestCount !== 1 ? 's' : ''}</Text>
              )}
            </View>
            {isDropTarget && <Ionicons name="arrow-down-circle" size={14} color={Colors.primary} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    direction: 'ltr',
  },
  node: {
    position: 'absolute',
    width: NODE_W,
    height: NODE_H,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 8,
  },
  nodeFocused: { borderColor: Colors.primary, backgroundColor: Colors.accentLight },
  nodeMoving: { borderColor: Colors.accent, backgroundColor: Colors.accentLight, borderWidth: 2 },
  nodeDropTarget: { borderColor: Colors.primary, borderStyle: 'dashed' },
  nodeDimmed: { opacity: 0.4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  nodeInfo: { flex: 1 },
  nodeName: { fontSize: 12, fontWeight: '600', color: Colors.text },
  nodeMeta: { fontSize: 10, color: Colors.textSecondary, marginTop: 1 },
});

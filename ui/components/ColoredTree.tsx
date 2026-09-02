import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { Colors, Radius } from '@/lib/theme';
import { GuestGroup, TableAssignment } from '@/lib/types';

const NODE_W = 120;
const NODE_H = 40;
const H_GAP = 12;
const V_GAP = 50;

const TABLE_COLORS = [
  '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
  '#00BCD4', '#FF5722', '#3F51B5', '#8BC34A', '#E91E63',
  '#009688', '#FFC107', '#673AB7', '#CDDC39', '#795548',
  '#607D8B', '#FF6F00', '#1565C0', '#2E7D32', '#AD1457',
];

interface LayoutNode {
  group: GuestGroup;
  x: number;
  y: number;
  children: LayoutNode[];
}

function subtreeWidth(group: GuestGroup, groups: GuestGroup[], depth: number, maxDepth?: number): number {
  if (maxDepth !== undefined && depth >= maxDepth) return NODE_W;
  const children = groups.filter(g => g.parentId === group.id).sort((a, b) => a.createdAt - b.createdAt);
  if (children.length === 0) return NODE_W;
  const childWidths = children.map(c => subtreeWidth(c, groups, depth + 1, maxDepth));
  return childWidths.reduce((a, b) => a + b, 0) + H_GAP * (children.length - 1);
}

function layoutTree(group: GuestGroup, groups: GuestGroup[], x: number, y: number, depth = 0, maxDepth?: number): LayoutNode {
  const children = groups.filter(g => g.parentId === group.id).sort((a, b) => a.createdAt - b.createdAt);
  if (children.length === 0 || (maxDepth !== undefined && depth >= maxDepth)) return { group, x, y, children: [] };
  const childWidths = children.map(c => subtreeWidth(c, groups, depth + 1, maxDepth));
  const totalW = childWidths.reduce((a, b) => a + b, 0) + H_GAP * (children.length - 1);
  let cx = x - totalW / 2;
  const childNodes: LayoutNode[] = [];
  for (let i = 0; i < children.length; i++) {
    const w = childWidths[i];
    childNodes.push(layoutTree(children[i], groups, cx + w / 2, y + NODE_H + V_GAP, depth + 1, maxDepth));
    cx += w + H_GAP;
  }
  return { group, x, y, children: childNodes };
}

function flattenNodes(node: LayoutNode): LayoutNode[] {
  return [node, ...node.children.flatMap(flattenNodes)];
}

function collectEdges(node: LayoutNode): { x1: number; y1: number; x2: number; y2: number }[] {
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const child of node.children) {
    edges.push({ x1: node.x, y1: node.y + NODE_H, x2: child.x, y2: child.y });
    edges.push(...collectEdges(child));
  }
  return edges;
}

interface Props {
  groups: GuestGroup[];
  rootId: string;
  tables: TableAssignment[];
  maxDepth?: number;
  onNodePress?: (id: string) => void;
}

export function ColoredTree({ groups, rootId, tables, maxDepth, onNodePress }: Props) {
  const root = groups.find(g => g.id === rootId);

  // Build groupId → [{tableId, count}] mapping
  const groupToTables = useMemo(() => {
    const map = new Map<string, Map<number, number>>();
    for (const t of tables) {
      for (const g of t.guests) {
        if (!map.has(g.groupId)) map.set(g.groupId, new Map());
        const counts = map.get(g.groupId)!;
        counts.set(t.tableId, (counts.get(t.tableId) || 0) + 1);
      }
    }
    // Convert to sorted arrays
    const result = new Map<string, { tableId: number; count: number }[]>();
    for (const [gid, counts] of map) {
      result.set(gid, [...counts.entries()]
        .map(([tableId, count]) => ({ tableId, count }))
        .sort((a, b) => b.count - a.count));
    }
    return result;
  }, [tables]);

  const layout = useMemo(() => {
    if (!root) return null;
    const totalW = subtreeWidth(root, groups, 0, maxDepth);
    return layoutTree(root, groups, Math.max(totalW / 2, 200), 20, 0, maxDepth);
  }, [groups, rootId, maxDepth]);

  if (!layout) return null;

  const allNodes = flattenNodes(layout);
  const edges = collectEdges(layout);
  const canvasW = Math.max(...allNodes.map(n => n.x + NODE_W / 2)) + 30;
  const canvasH = Math.max(...allNodes.map(n => n.y + NODE_H)) + 30;

  const tableIds = [...new Set(tables.map(t => t.tableId))].sort((a, b) => a - b);

  return (
    <View>
      <View style={{ width: canvasW, height: canvasH }}>
        <Svg pointerEvents="none" width={canvasW} height={canvasH} style={StyleSheet.absoluteFill}>
          {edges.map((e, i) => (
            <Line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={Colors.border} strokeWidth={1.5} />
          ))}
          {allNodes.map(n => {
            const tableSplits = groupToTables.get(n.group.id);
            const guestCount = n.group.guests.filter(g => g.expectedToArrive).length;
            const hasGuests = guestCount > 0 && tableSplits;
            const nx = n.x - NODE_W / 2;

            if (!hasGuests) {
              // Internal node or no guests
              return (
                <React.Fragment key={n.group.id}>
                  <Rect x={nx} y={n.y} width={NODE_W} height={NODE_H}
                    rx={6} fill={Colors.surface} stroke={Colors.border} strokeWidth={1} opacity={0.5} />
                  <SvgText x={n.x} y={n.y + 16} fontSize={10} fontWeight="600"
                    fill={Colors.text} textAnchor="middle">
                    {n.group.name.length > 16 ? n.group.name.slice(0, 15) + '…' : n.group.name}
                  </SvgText>
                </React.Fragment>
              );
            }

            // Leaf with guests — possibly split across tables
            const totalAssigned = tableSplits.reduce((s, t) => s + t.count, 0);
            const isSplit = tableSplits.length > 1;

            // Build label: "5p→T3" or "10p→T3, 6p→T5"
            const label = tableSplits.map(t => `${t.count}→T${t.tableId}`).join(', ');

            return (
              <React.Fragment key={n.group.id}>
                {/* Render color stripes for split groups */}
                {tableSplits.map((t, i) => {
                  const fraction = t.count / totalAssigned;
                  const stripeW = NODE_W * fraction;
                  const stripeX = nx + tableSplits.slice(0, i).reduce((s, prev) => s + (prev.count / totalAssigned) * NODE_W, 0);
                  const color = TABLE_COLORS[(t.tableId - 1) % TABLE_COLORS.length];
                  const isFirst = i === 0;
                  const isLast = i === tableSplits.length - 1;
                  return (
                    <Rect key={t.tableId} x={stripeX} y={n.y} width={stripeW} height={NODE_H}
                      rx={isFirst || isLast ? 6 : 0} fill={color} stroke={color} strokeWidth={isSplit ? 1 : 2} />
                  );
                })}
                {/* Border around the whole node if split */}
                {isSplit && (
                  <Rect x={nx} y={n.y} width={NODE_W} height={NODE_H}
                    rx={6} fill="none" stroke="#333" strokeWidth={1.5} strokeDasharray="4,2" />
                )}
                <SvgText x={n.x} y={n.y + 14} fontSize={10} fontWeight="600"
                  fill="#FFF" textAnchor="middle">
                  {n.group.name.length > 16 ? n.group.name.slice(0, 15) + '…' : n.group.name}
                </SvgText>
                <SvgText x={n.x} y={n.y + 28} fontSize={8}
                  fill="rgba(255,255,255,0.85)" textAnchor="middle">
                  {label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
        {onNodePress && allNodes.map(n => (
          <TouchableOpacity
            key={`hit-${n.group.id}`}
            style={{
              position: 'absolute',
              left: n.x - NODE_W / 2,
              top: n.y,
              width: NODE_W,
              height: NODE_H,
            }}
            onPress={() => onNodePress(n.group.id)}
            activeOpacity={0.7}
          />
        ))}
      </View>
      {/* Legend */}
      <View style={styles.legend}>
        {tableIds.map(tid => (
          <View key={tid} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: TABLE_COLORS[(tid - 1) % TABLE_COLORS.length] }]} />
            <Text style={styles.legendText}>Table {tid}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 11, color: Colors.textSecondary },
});

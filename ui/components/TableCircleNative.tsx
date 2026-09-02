import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Colors, Spacing } from '@/lib/theme';
import { TableAssignment } from '@/lib/types';
import { TableMetrics, cohesionColor, cohesionLabel, lonelinessColor } from '@/lib/metrics';

interface Props {
  table: TableAssignment;
  movingGuestId?: string | null;
  isDropTarget?: boolean;
  onGuestPress?: (guestId: string) => void;
  onGuestLongPress?: (guestId: string) => void;
  onTableDrop?: () => void;
  metrics?: TableMetrics;
  highlightLoneliest?: boolean;
  dimmed?: boolean;
  subtreeGroupIds?: Set<string>;
  groupColorMap?: Map<string, string>;
}

const TABLE_R = 60;
const GUEST_R = 22;

export function TableCircleNative({
  table,
  movingGuestId,
  isDropTarget,
  onGuestPress,
  onGuestLongPress,
  onTableDrop,
  metrics,
  highlightLoneliest,
  dimmed,
  subtreeGroupIds,
  groupColorMap,
}: Props) {
  const guests = table.guests;
  const cx = TABLE_R + GUEST_R + 10;
  const cy = TABLE_R + GUEST_R + 10;
  const size = (TABLE_R + GUEST_R + 10) * 2;

  const borderColor = highlightLoneliest
    ? '#F44336'
    : isDropTarget
      ? Colors.primary
      : metrics
        ? cohesionColor(metrics.cohesion)
        : Colors.accent;

  return (
    <TouchableOpacity
      style={[styles.wrap, isDropTarget && styles.dropTarget, dimmed && styles.dimmed]}
      onPress={isDropTarget ? onTableDrop : undefined}
      disabled={!isDropTarget}
      activeOpacity={isDropTarget ? 0.7 : 1}
    >
      <Text style={[styles.label, isDropTarget && styles.labelDrop]}>
        #{table.tableId} ({guests.length}){isDropTarget ? ' -> Drop' : ''}
      </Text>
      {metrics && (
        <View style={styles.metricsRow}>
          <Text style={[styles.metricBadge, { backgroundColor: cohesionColor(metrics.cohesion) }]}>
            Coh:{cohesionLabel(metrics.cohesion)}
          </Text>
          <Text style={[styles.metricBadge, { backgroundColor: lonelinessColor(metrics.loneliness) }]}>
            Lone:{metrics.loneliness.toFixed(1)}
          </Text>
          {highlightLoneliest && (
            <Text style={[styles.metricBadge, { backgroundColor: '#F44336' }]}>
              {metrics.loneliestGuestGroup}
            </Text>
          )}
        </View>
      )}

      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle
            cx={cx}
            cy={cy}
            r={TABLE_R}
            fill={isDropTarget ? '#E8F0FE' : dimmed ? '#f0f0f0' : Colors.accentLight}
            stroke={borderColor}
            strokeWidth={highlightLoneliest ? 3 : isDropTarget ? 2.5 : 2}
          />
          {guests.map((g, i) => {
            const angle = (2 * Math.PI * i) / Math.max(guests.length, 1) - Math.PI / 2;
            const gx = cx + (TABLE_R + 4) * Math.cos(angle);
            const gy = cy + (TABLE_R + 4) * Math.sin(angle);
            const isMoving = g.guestId === movingGuestId;
            const isSubtreeGuest = subtreeGroupIds ? subtreeGroupIds.has(g.groupId) : true;
            const groupColor = groupColorMap?.get(g.groupId);
            const guestFill = isMoving ? Colors.accentLight : !isSubtreeGuest ? '#e0e0e0' : groupColor || Colors.surface;
            const guestStroke = isMoving ? Colors.primary : !isSubtreeGuest ? '#bbb' : groupColor ? '#FFF' : Colors.primary;
            const textColor = isMoving ? Colors.primary : !isSubtreeGuest ? '#999' : groupColor ? '#FFF' : Colors.text;

            return (
              <React.Fragment key={g.guestId}>
                <Circle
                  cx={gx}
                  cy={gy}
                  r={GUEST_R}
                  fill={guestFill}
                  stroke={guestStroke}
                  strokeWidth={isMoving ? 3 : 1.5}
                />
                <SvgText
                  x={gx}
                  y={gy + 1}
                  fontSize={8}
                  fill={textColor}
                  fontWeight={isMoving ? 'bold' : 'normal'}
                  textAnchor="middle"
                  alignmentBaseline="central"
                >
                  {g.guestName.length > 8 ? `${g.guestName.slice(0, 7)}...` : g.guestName}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>

        {guests.map((g, i) => {
          const angle = (2 * Math.PI * i) / Math.max(guests.length, 1) - Math.PI / 2;
          const gx = cx + (TABLE_R + 4) * Math.cos(angle);
          const gy = cy + (TABLE_R + 4) * Math.sin(angle);
          return (
            <Pressable
              key={`guest-hit-${g.guestId}`}
              style={{
                position: 'absolute',
                left: gx - GUEST_R - 6,
                top: gy - GUEST_R - 6,
                width: (GUEST_R + 6) * 2,
                height: (GUEST_R + 6) * 2,
                borderRadius: GUEST_R + 6,
              }}
              onPress={() => onGuestPress?.(g.guestId)}
              onLongPress={() => onGuestLongPress?.(g.guestId)}
            />
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', margin: Spacing.sm },
  dropTarget: { backgroundColor: '#E8F0FE', borderRadius: 12, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed' },
  dimmed: { opacity: 0.5 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  labelDrop: { color: Colors.primary },
  metricsRow: { flexDirection: 'row', gap: 3, marginBottom: 2, flexWrap: 'wrap', justifyContent: 'center' },
  metricBadge: { fontSize: 9, color: '#FFF', fontWeight: '700', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
});

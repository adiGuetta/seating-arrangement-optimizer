import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/lib/theme';
import { GuestGroup } from '@/lib/types';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

interface Props {
  group: GuestGroup;
  depth: number;
  expanded: boolean;
  onToggle: () => void;
  onPress: () => void;
  hasChildren: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart?: () => void;
  onDrop?: () => void;
}

export function TreeRow({ group, depth, expanded, onToggle, onPress, hasChildren, isDragging, isDropTarget, onDragStart, onDrop }: Props) {
  const { getSubtreeGroups } = useStore();
  const { t } = useI18n();
  const subtree = getSubtreeGroups(group.id);
  const totalGuests = subtree.reduce((s, g) => s + g.guests.length, 0);
  const expectedGuests = subtree.reduce((s, g) => s + g.guests.filter(gu => gu.expectedToArrive).length, 0);

  return (
    <TouchableOpacity
      onPress={isDropTarget ? onDrop : undefined}
      disabled={!isDropTarget}
      activeOpacity={isDropTarget ? 0.6 : 1}
      style={[
        styles.row,
        { paddingLeft: Spacing.md + depth * 24 },
        isDragging && styles.dragging,
        isDropTarget && styles.dropTarget,
      ]}
    >
      {/* Drag handle */}
      {onDragStart && (
        <TouchableOpacity onPress={onDragStart} style={styles.dragHandle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="reorder-three" size={20} color={isDragging ? Colors.primary : Colors.disabled} />
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={onToggle} style={styles.chevron} disabled={!hasChildren}>
        {hasChildren ? (
          <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={18} color={Colors.textSecondary} />
        ) : (
          <View style={{ width: 18 }} />
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={onPress} style={styles.content} activeOpacity={0.6} disabled={isDropTarget}>
        <View style={[styles.dot, { backgroundColor: depth === 0 ? Colors.primary : depth === 1 ? Colors.accent : Colors.primaryLight }]} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
          <Text style={styles.meta}>
            {group.guests.length > 0 && `${group.guests.length} direct · `}
            {totalGuests} {t('total')} · {expectedGuests} {t('expected')}
          </Text>
        </View>
        {isDropTarget ? (
          <View style={styles.dropBadge}>
            <Ionicons name="arrow-forward-circle" size={18} color={Colors.primary} />
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={Colors.border} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  dragging: {
    backgroundColor: Colors.accentLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  dropTarget: {
    backgroundColor: '#F0F7FF',
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  dragHandle: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: { width: 28, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: Spacing.sm },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.text },
  meta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  dropBadge: { marginLeft: Spacing.xs },
});

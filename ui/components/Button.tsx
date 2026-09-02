import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { Colors, Radius, Spacing, Font } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style, icon }: Props) {
  const bg = {
    primary: Colors.primary,
    secondary: Colors.accentLight,
    danger: Colors.danger,
    ghost: 'transparent',
  }[variant];

  const fg = variant === 'secondary' ? Colors.primary
    : variant === 'ghost' ? Colors.primary
    : '#FFFFFF';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor: variant === 'ghost' ? Colors.border : bg },
        variant === 'ghost' && styles.ghost,
        disabled && { opacity: 0.5 },
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : (
        <>
          {icon}
          <Text style={[styles.label, { color: fg, marginLeft: icon ? Spacing.sm : 0 }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    minHeight: 48,
  },
  ghost: { borderWidth: 1 },
  label: { fontSize: 15, fontWeight: '600' },
});

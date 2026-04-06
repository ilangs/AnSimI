import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  isLoading?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  isLoading,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const bgColor = {
    primary: Colors.brand,
    secondary: Colors.white,
    danger: Colors.danger,
    ghost: 'transparent',
  }[variant];

  const textColor = {
    primary: Colors.white,
    secondary: Colors.textPrimary,
    danger: Colors.white,
    ghost: Colors.brand,
  }[variant];

  const height = { sm: 44, md: 52, lg: 60 }[size];
  const fontSize = { sm: 14, md: 16, lg: 18 }[size];

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: bgColor, height, minHeight: 56 },
        variant === 'secondary' && styles.secondaryBorder,
        (disabled || isLoading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
    >
      {isLoading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor, fontSize }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  secondaryBorder: {
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  disabled: { opacity: 0.5 },
  text: { fontWeight: '700' },
});

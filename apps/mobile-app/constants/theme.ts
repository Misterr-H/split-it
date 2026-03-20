import { Platform } from 'react-native';

export const Colors = {
  primary: '#1B998B',
  primaryLight: '#E8F8F6',
  danger: '#E84545',
  dangerLight: '#FDEAEA',
  warning: '#F59E0B',

  light: {
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    background: '#F5F7FA',
    card: '#FFFFFF',
    border: '#E5E7EB',
    tint: '#1B998B',
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#1B998B',
  },
  dark: {
    text: '#F3F4F6',
    textSecondary: '#9CA3AF',
    background: '#111827',
    card: '#1F2937',
    border: '#374151',
    tint: '#34D399',
    icon: '#9CA3AF',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#34D399',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

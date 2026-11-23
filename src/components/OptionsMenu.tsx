import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/i18n';
import { colors, radius, spacing } from '@/theme';

import { MoreIcon } from './icons';
import { T } from './ui';

const ITEMS: { label: string; href: Href }[] = [
  { label: strings.menu.library, href: '/biblioteca' },
  { label: strings.menu.settings, href: '/configuracoes' },
  { label: strings.menu.help, href: '/ajuda' },
  { label: strings.menu.terms, href: '/termos' },
];

/** Botão ⋮ do canto superior direito do Início, com o menu (spec seção 3). */
export function OptionsMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.menu.a11yLabel}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.button, { opacity: pressed ? 0.7 : 1 }]}
      >
        <MoreIcon />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.backdrop}
          accessibilityLabel={strings.menu.close}
          onPress={() => setOpen(false)}
        >
          <View style={[styles.menu, { top: insets.top + 68 }]}>
            {ITEMS.map((item, i) => (
              <Pressable
                key={item.label}
                accessibilityRole="menuitem"
                onPress={() => {
                  setOpen(false);
                  router.push(item.href);
                }}
                style={({ pressed }) => [
                  styles.item,
                  i > 0 && styles.itemDivider,
                  pressed && { backgroundColor: colors.surfaceMuted },
                ]}
              >
                <T variant="title">{item.label}</T>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(22,24,26,0.25)' },
  menu: {
    position: 'absolute',
    right: spacing.xl,
    minWidth: 240,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  item: { paddingVertical: 14, paddingHorizontal: spacing.lg },
  itemDivider: { borderTopWidth: 1, borderTopColor: colors.border },
});

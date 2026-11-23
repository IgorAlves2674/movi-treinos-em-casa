import type { ReactNode } from 'react';

import { strings } from '@/i18n';
import { colors } from '@/theme';

import { Card, Screen, T } from './ui';

/** Tela provisória para as abas/rotas que serão construídas nas próximas etapas. */
export function PlaceholderScreen({
  title,
  description,
  showTitle = true,
  children,
}: {
  title: string;
  description?: string;
  showTitle?: boolean;
  children?: ReactNode;
}) {
  return (
    <Screen>
      {showTitle && <T variant="h1">{title}</T>}
      <Card>
        <T variant="body" color={colors.textSecondary}>
          {description ?? strings.placeholder.comingSoon}
        </T>
      </Card>
      {children}
    </Screen>
  );
}

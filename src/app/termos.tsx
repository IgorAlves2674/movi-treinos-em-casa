import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { strings } from '@/i18n';

export default function TermsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: strings.menu.terms }} />
      <PlaceholderScreen title={strings.menu.terms} showTitle={false} />
    </>
  );
}

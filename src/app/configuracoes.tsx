import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { strings } from '@/i18n';

export default function SettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: strings.menu.settings }} />
      <PlaceholderScreen title={strings.menu.settings} showTitle={false} />
    </>
  );
}

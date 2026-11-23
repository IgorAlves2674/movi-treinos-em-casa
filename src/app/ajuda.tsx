import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { strings } from '@/i18n';

export default function HelpScreen() {
  return (
    <>
      <Stack.Screen options={{ title: strings.menu.help }} />
      <PlaceholderScreen title={strings.menu.help} showTitle={false} />
    </>
  );
}

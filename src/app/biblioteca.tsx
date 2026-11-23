import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { strings } from '@/i18n';

export default function LibraryScreen() {
  return (
    <>
      <Stack.Screen options={{ title: strings.menu.library }} />
      <PlaceholderScreen title={strings.menu.library} showTitle={false} />
    </>
  );
}

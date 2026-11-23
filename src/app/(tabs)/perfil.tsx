import { useRouter } from 'expo-router';

import { DevSyncPanel } from '@/components/DevSyncPanel';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { SecondaryButton } from '@/components/ui';
import { strings } from '@/i18n';

export default function ProfileScreen() {
  const router = useRouter();
  return (
    <PlaceholderScreen title={strings.profile.title} description={strings.profile.empty}>
      {__DEV__ && (
        <>
          <SecondaryButton label={strings.dev.figureDemo} onPress={() => router.push('/boneco-teste')} />
          <DevSyncPanel />
        </>
      )}
    </PlaceholderScreen>
  );
}

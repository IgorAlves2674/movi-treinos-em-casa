import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { DevSyncPanel } from '@/components/DevSyncPanel';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { SecondaryButton } from '@/components/ui';
import { strings } from '@/i18n';
import { resetProfileForTesting } from '@/profile/useProfile';

export default function ProfileScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  return (
    <PlaceholderScreen title={strings.profile.title} description={strings.profile.empty}>
      {__DEV__ && (
        <>
          <SecondaryButton label={strings.dev.figureDemo} onPress={() => router.push('/boneco-teste')} />
          <SecondaryButton label={strings.dev.resetOnboarding} onPress={() => void resetProfileForTesting(db)} />
          <DevSyncPanel />
        </>
      )}
    </PlaceholderScreen>
  );
}

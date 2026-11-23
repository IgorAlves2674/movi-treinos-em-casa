import { DevSyncPanel } from '@/components/DevSyncPanel';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { strings } from '@/i18n';

export default function ProfileScreen() {
  return (
    <PlaceholderScreen title={strings.profile.title} description={strings.profile.empty}>
      {__DEV__ && <DevSyncPanel />}
    </PlaceholderScreen>
  );
}

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { strings } from '@/i18n';

export default function ProgressScreen() {
  return <PlaceholderScreen title={strings.progress.title} description={strings.progress.empty} />;
}

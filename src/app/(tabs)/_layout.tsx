import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChartIcon, DumbbellIcon, HomeIcon, PersonIcon } from '@/components/icons';
import { strings } from '@/i18n';
import { colors, fonts } from '@/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 68 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: strings.tabs.home,
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="treinos"
        options={{
          title: strings.tabs.workouts,
          tabBarIcon: ({ color }) => <DumbbellIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="evolucao"
        options={{
          title: strings.tabs.progress,
          tabBarIcon: ({ color }) => <ChartIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: strings.tabs.profile,
          tabBarIcon: ({ color }) => <PersonIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

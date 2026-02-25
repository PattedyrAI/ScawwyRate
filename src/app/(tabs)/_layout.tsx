import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUnreadCount } from '@/features/notifications/hooks/useNotifications';
import { colors } from '@/theme';

function TabIcon({ name, color, size, isCenterTab, badge }: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  isCenterTab?: boolean;
  badge?: number;
}) {
  if (isCenterTab) {
    return (
      <View style={styles.centerTab}>
        <Ionicons name={name} size={size + 4} color={colors.textInverse} />
      </View>
    );
  }
  return (
    <View>
      <Ionicons name={name} size={size} color={color} />
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { data: unreadCount } = useUnreadCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="(feed)"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <TabIcon name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="(search)"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <TabIcon name="search" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="(rate)"
        options={{
          title: 'Rate',
          tabBarIcon: ({ color, size }) => <TabIcon name="add" color={color} size={size} isCenterTab />,
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="(activity)"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="notifications-outline" color={color} size={size} badge={unreadCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <TabIcon name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.tabBarBackground,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  tabBarItem: {
    paddingTop: 4,
  },
  centerTab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
});

import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import MainLayout from '../../layouts/MainLayout';

function TabBarIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={21} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  return (
    <MainLayout>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#047857',
          tabBarInactiveTintColor: '#737373',
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: '#e5e5e5',
            backgroundColor: '#ffffff',
            elevation: 0,
            shadowOpacity: 0,
            height: 82,
            paddingBottom: 18,
            paddingTop: 8,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} /> }} />
        <Tabs.Screen name="two" options={{ title: 'Catálogo', tabBarIcon: ({ color }) => <TabBarIcon name="th-large" color={color} /> }} />
        <Tabs.Screen name="chats" options={{ title: 'Chats', tabBarIcon: ({ color }) => <TabBarIcon name="comments" color={color} /> }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
    </MainLayout>
  );
}

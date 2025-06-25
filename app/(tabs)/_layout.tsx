import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';

// Modern TabBar Icon component
function TabBarIcon(props: {
  IconComponent: any;
  name: string;
  color: string;
  size?: number;
}) {
  const { IconComponent, name, color, size = 24 } = props;
  return <IconComponent name={name} size={size} color={color} style={{ marginBottom: -3 }} />;
}

export default function TabLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 15,
          paddingTop: 8,
          height: 75,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
          marginBottom: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <TabBarIcon IconComponent={FontAwesome5} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => (
            <TabBarIcon IconComponent={FontAwesome5} name="calendar-alt" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="exchange"
        options={{
          title: 'Exchange',
          tabBarIcon: ({ color }) => (
            <TabBarIcon IconComponent={FontAwesome5} name="coins" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="approval"
        options={{
          title: 'Approval',
          href: isAdmin ? '/approval' : null, // Hide tab for non-admins
          tabBarIcon: ({ color }) => (
            <TabBarIcon IconComponent={FontAwesome5} name="check-circle" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <TabBarIcon IconComponent={FontAwesome5} name="cog" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

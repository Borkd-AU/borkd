import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#7A9E7E',
        tabBarInactiveTintColor: '#8C8279',
        tabBarStyle: {
          backgroundColor: '#FAF6F1',
          borderTopColor: '#E8E2DA',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Walk',
          tabBarLabel: 'Walk',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarLabel: 'Map',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}

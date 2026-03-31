import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 items-center justify-center">
        <Text className="font-display text-2xl text-charcoal">
          Profile
        </Text>
        <Text className="font-body text-base text-stone mt-2">
          Your walks & dogs
        </Text>
      </View>
    </SafeAreaView>
  );
}

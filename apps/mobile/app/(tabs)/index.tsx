import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WalkScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="font-display text-2xl text-charcoal">
          Borkd
        </Text>
        <Text className="font-body text-base text-stone mt-2">
          Start your walk
        </Text>
      </View>
    </SafeAreaView>
  );
}

import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="font-display text-3xl text-charcoal">Welcome back</Text>
      </View>
    </SafeAreaView>
  );
}

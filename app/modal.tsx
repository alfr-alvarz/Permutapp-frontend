import { StatusBar } from 'expo-status-bar';
import { Platform, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function ModalScreen() {
  return (
    <View className="flex-1 bg-neutral-50 items-center justify-center px-6">
      <View className="bg-white border border-neutral-100 rounded-3xl p-6 w-full max-w-sm items-center">
        <View className="w-16 h-16 rounded-3xl bg-brand-50 items-center justify-center mb-4">
          <FontAwesome name="info" size={24} color="#047857" />
        </View>
        <Text className="text-neutral-950 text-2xl font-bold text-center">Permutapp</Text>
        <Text className="text-neutral-500 text-sm text-center leading-5 mt-2">
          Este espacio queda reservado para información contextual, ayuda o confirmaciones dentro del flujo de permutas.
        </Text>
      </View>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

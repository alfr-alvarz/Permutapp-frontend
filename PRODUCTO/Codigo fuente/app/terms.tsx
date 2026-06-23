import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { BrandBanner, InfoBanner } from '@/components/ui';

const sections = [
  ['Uso de Permutapp', 'Permutapp es una plataforma para publicar productos, explorar oportunidades de permuta y coordinar intercambios entre usuarios. Debes usar la app de forma honesta, respetuosa y conforme a la ley chilena.'],
  ['Cuenta y verificación', 'Al crear una cuenta declaras que los datos entregados son reales. La verificación con carnet y selfie busca proteger a la comunidad, reducir suplantaciones y habilitar funciones sensibles como recuperación de contraseña.'],
  ['Publicaciones', 'Eres responsable de la información, fotos y valor referencial que publiques. No debes publicar productos robados, falsificados, peligrosos, ilegales, con datos personales de terceros o que infrinjan derechos de otras personas.'],
  ['Permutas y encuentros', 'Los acuerdos entre usuarios se coordinan directamente entre las partes. Recomendamos usar puntos públicos, revisar el producto antes del intercambio y mantener la comunicación dentro de la app cuando sea posible.'],
  ['Conductas no permitidas', 'No se permite acosar, estafar, suplantar identidad, intentar acceder a cuentas ajenas, manipular datos, explotar vulnerabilidades, automatizar abusos o usar la plataforma para actividades contrarias a la ley.'],
  ['Seguridad de la cuenta', 'Debes cuidar tus credenciales y avisar si sospechas uso no autorizado. La recuperación de contraseña puede requerir una nueva verificación de identidad para proteger tu cuenta.'],
  ['Disponibilidad', 'La app puede tener interrupciones por mantenimiento, proveedores técnicos, conectividad o mejoras. Trabajamos para mantener el servicio disponible y seguro, pero no podemos garantizar operación sin fallas.'],
  ['Cambios', 'Podemos actualizar estos términos para reflejar mejoras de la app, cambios legales o nuevas medidas de seguridad. Si los cambios son relevantes, se informarán dentro de la plataforma.'],
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-neutral-50" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
      <View className="mb-6 md:hidden">
        <BrandBanner />
      </View>
      <TouchableOpacity className="self-start mb-5 flex-row items-center" onPress={() => router.back()} activeOpacity={0.75}>
        <FontAwesome name="chevron-left" size={13} color="#047857" />
        <Text className="text-brand-700 font-bold ml-2">Volver</Text>
      </TouchableOpacity>
      <Text className="text-brand-700 text-xs uppercase tracking-widest font-bold mb-2">Legal</Text>
      <Text className="text-3xl font-bold text-neutral-950 mb-3">Términos de Servicio</Text>
      <Text className="text-neutral-500 text-sm leading-6 mb-5">
        Última actualización: 8 de junio de 2026. Este texto resume reglas de uso para Permutapp y se basa en normativa chilena aplicable a datos personales, consumo y seguridad informática.
      </Text>
      <InfoBanner icon="info-circle" title="Transparencia" body="Este documento no reemplaza asesoría legal profesional, pero fija reglas claras para usar la plataforma de forma segura." tone="neutral" />
      <View className="mt-5 gap-3">
        {sections.map(([title, body]) => (
          <View key={title} className="bg-white border border-neutral-100 rounded-3xl p-5">
            <Text className="text-neutral-950 font-bold text-base mb-2">{title}</Text>
            <Text className="text-neutral-500 text-sm leading-6">{body}</Text>
          </View>
        ))}
      </View>
      <View className="bg-white border border-neutral-100 rounded-3xl p-5 mt-3">
        <Text className="text-neutral-950 font-bold text-base mb-2">Normativa considerada</Text>
        <Text className="text-neutral-500 text-sm leading-6">
          Ley 19.628 sobre protección de datos personales y sus modificaciones por Ley 21.719, Ley 19.496 sobre derechos de las personas consumidoras y Ley 21.459 sobre delitos informáticos.
        </Text>
      </View>
    </ScrollView>
  );
}

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { BrandBanner, InfoBanner } from '@/components/ui';

const sections = [
  ['Datos que tratamos', 'Tratamos los datos que entregas al registrarte, como nombre, correo, RUN y contraseña protegida con hash. También tratamos publicaciones, mensajes, ubicación aproximada de productos, estado de verificación y datos técnicos necesarios para operar la app.'],
  ['Carnet y selfie', 'La foto del carnet y la selfie se usan para confirmar identidad con OCR y comparación facial. No se publican en tu perfil, catálogo ni chats. No se venden ni se comparten con otros usuarios o terceros comerciales.'],
  ['Proveedores técnicos', 'Para operar la app podemos usar proveedores técnicos como hosting, base de datos y servicios de verificación. Estos proveedores solo participan para prestar el servicio, procesar imágenes de verificación, mantener infraestructura o proteger la plataforma.'],
  ['Finalidades', 'Usamos tus datos para crear y proteger cuentas, iniciar sesión, verificar identidad, publicar productos, coordinar permutas, enviar notificaciones, prevenir fraudes, resolver problemas técnicos y cumplir obligaciones legales.'],
  ['Privacidad frente a otros usuarios', 'Otros usuarios no ven tu carnet, selfie, contraseña, token de sesión ni datos internos de verificación. En la app solo se muestra información necesaria para publicar, conversar y coordinar permutas.'],
  ['Seguridad', 'Aplicamos medidas como contraseñas con hash, JWT para sesión, validación de archivos, límites de tamaño, recuperación con identidad verificada y uso de proveedores especializados para OCR y reconocimiento facial.'],
  ['Conservación', 'Conservamos datos mientras tu cuenta esté activa o mientras sean necesarios para seguridad, auditoría, prevención de abuso o cumplimiento legal. Las imágenes de verificación no se usan para fines publicitarios.'],
  ['Tus derechos', 'Puedes solicitar información sobre tus datos, corrección, eliminación o bloqueo cuando corresponda según la Ley 19.628 y sus modificaciones. Algunas solicitudes pueden requerir comprobar identidad para evitar accesos indebidos.'],
  ['No venta de datos', 'Permutapp no vende tus datos personales. Tampoco comparte carnet, rostro o información de identidad con anunciantes, otros usuarios o terceros para fines comerciales.'],
];

export default function PrivacyScreen() {
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
      <Text className="text-3xl font-bold text-neutral-950 mb-3">Política de Privacidad</Text>
      <Text className="text-neutral-500 text-sm leading-6 mb-5">
        Última actualización: 8 de junio de 2026. Explicamos cómo Permutapp trata datos personales, carnet y selfie para operar una comunidad de permutas más segura.
      </Text>
      <InfoBanner icon="shield" title="Tus datos son privados" body="No publicamos tu carnet ni tu rostro. No vendemos tus datos y no los compartimos con otros usuarios ni terceros comerciales." />
      <View className="mt-5 gap-3">
        {sections.map(([title, body]) => (
          <View key={title} className="bg-white border border-neutral-100 rounded-3xl p-5">
            <Text className="text-neutral-950 font-bold text-base mb-2">{title}</Text>
            <Text className="text-neutral-500 text-sm leading-6">{body}</Text>
          </View>
        ))}
      </View>
      <View className="bg-white border border-neutral-100 rounded-3xl p-5 mt-3">
        <Text className="text-neutral-950 font-bold text-base mb-2">Base legal considerada</Text>
        <Text className="text-neutral-500 text-sm leading-6">
          Esta política considera la Ley 19.628 sobre protección de datos personales, su actualización por Ley 21.719, la Ley 19.496 sobre derechos de consumidores y la Ley 21.459 sobre delitos informáticos.
        </Text>
      </View>
    </ScrollView>
  );
}

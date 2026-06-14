import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { ResumenValoracion, obtenerResumenValoracion } from '../services/tradeApi';

export function ReputationSummary({ usuarioId }: { usuarioId: number }) {
  const [summary, setSummary] = useState<ResumenValoracion | null>(null);

  useEffect(() => {
    let mounted = true;
    obtenerResumenValoracion(usuarioId)
      .then((result) => { if (mounted) setSummary(result); })
      .catch(() => { if (mounted) setSummary(null); });
    return () => { mounted = false; };
  }, [usuarioId]);

  if (!summary) return null;

  return (
    <View className="bg-white border border-neutral-100 rounded-3xl p-5 mb-4">
      <Text className="text-neutral-400 text-xs uppercase tracking-widest font-bold">Reputación verificada</Text>
      <View className="flex-row items-center mt-3">
        <FontAwesome name="star" size={22} color="#f59e0b" />
        <Text className="text-neutral-950 text-2xl font-bold ml-2">
          {summary.cantidad > 0 ? summary.promedio.toFixed(1) : 'Sin notas'}
        </Text>
        <Text className="text-neutral-500 text-sm ml-2">
          {summary.cantidad === 1 ? '1 permuta valorada' : `${summary.cantidad} permutas valoradas`}
        </Text>
      </View>
      {summary.valoraciones[0]?.comentario ? (
        <Text className="text-neutral-600 text-sm leading-5 mt-3">“{summary.valoraciones[0].comentario}”</Text>
      ) : null}
    </View>
  );
}

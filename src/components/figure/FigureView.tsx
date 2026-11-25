import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { G, Line, Path } from 'react-native-svg';

import { buildFrame, FIGURE_COLORS, frameBox } from '@/figure/build';
import type { FigureAnimation, FigureView as View3D } from '@/figure/types';

type Props = {
  anim: FigureAnimation;
  view: View3D;
  /** Pausa a animação (ex.: tela fora de foco). Padrão: tocando. */
  paused?: boolean;
  /** Mostra uma pose fixa no instante dado (0 a 1), sem animar. Útil para miniaturas. */
  frozenAt?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Boneco animado (spec seção 6). Monta cada quadro com `buildFrame` e desenha
 * com react-native-svg. A área tem fundo escuro e proporção 13:10.
 */
export const FigureView = memo(function FigureView({ anim, view, paused = false, frozenAt, style }: Props) {
  // Vistas não disponíveis (ex.: exercício deitado) caem na lateral.
  const safeView = anim.views.includes(view) ? view : 'lateral';
  const box = useMemo(() => frameBox(anim, safeView), [anim, safeView]);
  const [t, setT] = useState(0);

  useEffect(() => {
    if (paused || frozenAt !== undefined) return;
    let raf = 0;
    const start = Date.now();
    const loop = () => {
      setT(((Date.now() - start) % anim.durationMs) / anim.durationMs);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [anim, paused, frozenAt]);

  const shownT = frozenAt ?? t;
  const { items } = useMemo(() => buildFrame(anim, shownT, safeView), [anim, shownT, safeView]);

  return (
    <View style={[styles.stage, style]}>
      <Svg width="100%" height="100%" viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}>
        <Line x1={box.x} x2={box.x + box.w} y1={1} y2={1} stroke={FIGURE_COLORS.floor} strokeWidth={2} />
        <G stroke={FIGURE_COLORS.outline} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round">
          {items.map((it, i) => (
            <Path
              key={i}
              d={it.path}
              fill={it.fill}
              stroke={it.stroke}
              strokeWidth={it.strokeWidth}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  stage: {
    width: '100%',
    aspectRatio: 13 / 10,
    backgroundColor: FIGURE_COLORS.stage,
    borderRadius: 13,
    overflow: 'hidden',
  },
});

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TabSlot, type TabsDescriptor, type TabsSlotRenderOptions } from 'expo-router/ui';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

interface PrismTabSlotProps {
  activeRouteName: string;
  backgroundColor: string;
  routeNames: readonly string[];
}

export function PrismTabSlot({
  activeRouteName,
  backgroundColor,
  routeNames,
}: PrismTabSlotProps) {
  const { width } = useWindowDimensions();
  const [isReady, setIsReady] = useState(false);
  const sideCount = Math.max(routeNames.length, 3);
  const stepDegrees = 360 / sideCount;
  const prismDepth = (width / 2) / Math.tan(Math.PI / sideCount);
  const perspective = Math.max(width * 1.4, 900);
  const routeFaceIndexes = useMemo(
    () => new Map(routeNames.map((routeName, index) => [routeName, index])),
    [routeNames]
  );
  const activeFaceIndex = routeFaceIndexes.get(activeRouteName) ?? 0;

  const renderPrismFace = useCallback((
    descriptor: TabsDescriptor,
    { index, isFocused, loaded }: TabsSlotRenderOptions
  ) => {
    const faceIndex = routeFaceIndexes.get(descriptor.route.name) ?? index;
    const relativeFaceIndex = faceIndex - activeFaceIndex;

    return (
      <View
        {...(!isFocused ? ({ 'aria-hidden': true } as any) : {})}
        {...({ dataSet: { prismFace: isReady ? 'ready' : 'initial' } } as any)}
        accessibilityElementsHidden={!isFocused}
        importantForAccessibility={isFocused ? 'auto' : 'no-hide-descendants'}
        style={[
          styles.prismFace,
          {
            backgroundColor,
            pointerEvents: isFocused ? 'auto' : 'none',
            zIndex: isFocused ? 1 : 0,
            transform: [
              { rotateY: `${relativeFaceIndex * stepDegrees}deg` },
              { translateZ: prismDepth },
            ],
          },
        ]}
      >
        {(loaded || isFocused) && descriptor.render()}
      </View>
    );
  }, [activeFaceIndex, backgroundColor, isReady, prismDepth, routeFaceIndexes, stepDegrees]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <View
      style={[
        styles.sceneViewport,
        { backgroundColor, perspective } as any,
      ]}
    >
      <View
        style={[
          styles.prismDepth,
          { transform: [{ translateZ: -prismDepth }] },
        ]}
      >
        <View style={styles.prismStage}>
          <TabSlot
            detachInactiveScreens={false}
            renderFn={renderPrismFace}
            style={styles.prismFaces}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sceneViewport: {
    height: '100%',
    overflow: 'hidden',
  },
  prismDepth: {
    position: 'relative',
    width: '100%',
    height: '100%',
    transformStyle: 'preserve-3d',
  } as any,
  prismStage: {
    width: '100%',
    height: '100%',
    transformStyle: 'preserve-3d',
  } as any,
  prismFaces: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    transformStyle: 'preserve-3d',
  } as any,
  prismFace: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backfaceVisibility: 'hidden',
    overflow: 'hidden',
  } as any,
});

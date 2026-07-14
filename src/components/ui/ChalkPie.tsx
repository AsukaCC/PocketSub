import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import * as d3Shape from 'd3-shape';
import { useCustomTheme } from '@/context/ThemeContext';
import { Fonts } from '@/constants/theme';
import { useI18n } from '@/context/I18nContext';
import { useCurrency } from '@/context/CurrencyContext';

interface PieData {
  label: string;
  value: number;
  colorKey: 'primary' | 'secondary' | 'accentGreen' | 'accentYellow';
}

interface ChalkPieProps {
  data: PieData[];
  size?: number;
}

export function ChalkPie({ data, size = 180 }: ChalkPieProps) {
  const { colors } = useCustomTheme();
  const { t, locale } = useI18n();
  const { displayCurrency } = useCurrency();
  const filteredData = data.filter(item => item.value > 0);
  const total = filteredData.reduce((sum, item) => sum + item.value, 0);
  const arcs = d3Shape.pie<PieData>()
    .value(item => item.value)
    .sort(null)
    .padAngle(0.018)(filteredData);

  const outerRadius = size / 2 - 8;
  const innerRadius = outerRadius * 0.58;
  const arcGenerator = d3Shape.arc<d3Shape.PieArcDatum<PieData>>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .cornerRadius(3);

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G transform={`translate(${size / 2}, ${size / 2})`}>
            {arcs.map(arc => (
              <Path
                key={arc.data.label}
                d={arcGenerator(arc) ?? ''}
                fill={colors[arc.data.colorKey]}
                stroke={colors.backgroundElement}
                strokeWidth={2}
              />
            ))}
            <SvgText
              x={0}
              y={-2}
              fill={colors.text}
              fontSize={20}
              fontWeight="700"
              fontFamily={Fonts.heading}
              textAnchor="middle"
            >
              {new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: displayCurrency,
                maximumFractionDigits: 0,
              }).format(total)}
            </SvgText>
            <SvgText
              x={0}
              y={17}
              fill={colors.textSecondary}
              fontSize={10}
              fontFamily={Fonts.body}
              textAnchor="middle"
            >
              {t('analytics.perMonth')}
            </SvgText>
          </G>
        </Svg>
      </View>

      <View style={styles.legendContainer}>
        {filteredData.map(item => {
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: colors[item.colorKey] }]} />
              <View style={styles.legendCopy}>
                <Text style={[styles.legendText, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                  {new Intl.NumberFormat(locale, {
                    style: 'currency',
                    currency: displayCurrency,
                    maximumFractionDigits: 1,
                  }).format(item.value)} · {percentage}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  legendContainer: {
    marginTop: 16,
    alignSelf: 'stretch',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendCopy: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  legendText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '500',
  },
  legendValue: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
});

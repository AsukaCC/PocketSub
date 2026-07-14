import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import * as d3Scale from 'd3-scale';
import { useCustomTheme } from '@/context/ThemeContext';
import { Fonts } from '@/constants/theme';
import { useI18n } from '@/context/I18nContext';
import { useCurrency } from '@/context/CurrencyContext';

interface ChartPoint {
  label: string;
  value: number;
}

interface SketchyChartProps {
  data: ChartPoint[];
  width?: number;
  height?: number;
}

export function SketchyChart({ data, width = 310, height = 180 }: SketchyChartProps) {
  const { colors, isDark } = useCustomTheme();
  const { locale } = useI18n();
  const { displayCurrency } = useCurrency();
  const padding = { top: 14, right: 14, bottom: 30, left: 42 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xScale = d3Scale.scalePoint()
    .domain(data.map(item => item.label))
    .range([0, chartWidth]);

  const maxValue = Math.max(...data.map(item => item.value), 10);
  const yScale = d3Scale.scaleLinear()
    .domain([0, maxValue * 1.12])
    .range([chartHeight, 0]);

  const points = data.map(item => ({
    x: padding.left + (xScale(item.label) ?? 0),
    y: padding.top + yScale(item.value),
  }));

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ');
  const baseline = padding.top + chartHeight;
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)},${baseline} L ${points[0].x.toFixed(1)},${baseline} Z`
    : '';
  const yTicks = yScale.ticks(4);
  const gridColor = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(16,24,40,0.08)';

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {yTicks.map(tick => {
          const y = padding.top + yScale(tick);
          return (
            <React.Fragment key={tick}>
              <Line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke={gridColor}
                strokeWidth={1}
              />
              <SvgText
                x={padding.left - 8}
                y={y + 4}
                fill={colors.textSecondary}
                fontSize={10}
                fontFamily={Fonts.body}
                textAnchor="end"
              >
                {new Intl.NumberFormat(locale, {
                  style: 'currency',
                  currency: displayCurrency,
                  notation: 'compact',
                  maximumFractionDigits: 0,
                }).format(tick)}
              </SvgText>
            </React.Fragment>
          );
        })}

        <Line
          x1={padding.left}
          y1={baseline}
          x2={padding.left + chartWidth}
          y2={baseline}
          stroke={colors.border}
          strokeWidth={1}
        />

        {areaPath !== '' && (
          <Path d={areaPath} fill={colors.primary} opacity={0.1} />
        )}
        {linePath !== '' && (
          <Path
            d={linePath}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((point, index) => (
          <Circle
            key={data[index].label}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={colors.primary}
            stroke={colors.backgroundElement}
            strokeWidth={2}
          />
        ))}

        {data.map(item => {
          const x = padding.left + (xScale(item.label) ?? 0);
          return (
            <SvgText
              key={item.label}
              x={x}
              y={baseline + 19}
              fill={colors.textSecondary}
              fontSize={11}
              fontFamily={Fonts.body}
              textAnchor="middle"
            >
              {item.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
});

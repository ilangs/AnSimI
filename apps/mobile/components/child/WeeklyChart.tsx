import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface DataPoint {
  date: string;
  count: number;
}

interface WeeklyChartProps {
  data: DataPoint[];
  title?: string;
}

export default function WeeklyChart({ data, title = '이번 주 차단 현황' }: WeeklyChartProps) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}

      <View style={styles.chart}>
        {data.map((point, i) => {
          const heightPct = (point.count / maxCount) * 100;
          const isToday = i === data.length - 1;
          return (
            <View key={point.date} style={styles.barWrapper}>
              <Text style={styles.countLabel}>{point.count > 0 ? point.count : ''}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(4, heightPct)}%`,
                      backgroundColor: isToday ? Colors.brand : Colors.brand + '60',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                {getDayLabel(point.date)}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: Colors.brand }]} />
        <Text style={styles.legendText}>오늘</Text>
        <View style={[styles.legendDot, { backgroundColor: Colors.brand + '60', marginLeft: 12 }]} />
        <Text style={styles.legendText}>이전 날</Text>
      </View>
    </View>
  );
}

function getDayLabel(dateStr: string): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const d = new Date(dateStr);
  return days[d.getDay()];
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 8,
    marginBottom: 8,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  countLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 6,
    fontWeight: '500',
  },
  dayLabelToday: {
    color: Colors.brand,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
});

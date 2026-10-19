import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MATCHES_URL } from '../config';
import { useFavorites } from '../hooks/useFavorites';
import { FavoriteButton } from '../components/FavoriteButton';
import { UpdatedAgo } from '../components/UpdatedAgo';

// Типы данных
type MatchStatus = 'scheduled' | 'finished' | 'live' | 'cancelled' | 'postponed';

type Team = {
  name: string;
};

type Match = {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number | null;
  awayScore?: number | null;
  startTime: string; // ISO string
  status: MatchStatus;
};

// Фильтры
type Filter = 'all' | 'upcoming' | 'finished';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'upcoming', label: 'Предстоящие' },
  { key: 'finished', label: 'Завершённые' },
];

// Статусы
const STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: 'Запланирован',
  finished: 'Завершён',
  live: 'В прямом эфире',
  cancelled: 'Отменён',
  postponed: 'Перенесён',
};

export function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { isFavorite, toggle } = useFavorites();

  const fetchMatches = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch(MATCHES_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      // Простая валидация, что пришел массив
      const matchesData = Array.isArray(data) ? data : data.matches;
      if (!Array.isArray(matchesData)) throw new Error('Invalid data format');

      setMatches(matchesData);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Не удалось загрузить матчи. Проверьте подключение.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const filteredMatches = matches.filter((match) => {
    if (filter === 'all') return true;
    if (filter === 'finished') return match.status === 'finished';
    
    // В "Предстоящие" относим всё, что еще не завершено и не отменено
    if (filter === 'upcoming') {
      return ['scheduled', 'live', 'postponed'].includes(match.status);
    }
    return true;
  });

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderScore = (match: Match) => {
    if (match.homeScore == null || match.awayScore == null) {
      return <Text style={styles.score}>- : -</Text>;
    }
    return (
      <Text style={styles.score}>
        {match.homeScore} : {match.awayScore}
      </Text>
    );
  };

  const renderItem = ({ item }: { item: Match }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.status}>{STATUS_LABELS[item.status] || item.status}</Text>
          <Text style={styles.date}>{formatDate(item.startTime)}</Text>
        </View>
        <FavoriteButton
          active={isFavorite(item.id)}
          onPress={() => toggle(item.id)}
        />
      </View>

      <View style={styles.matchRow}>
        <Text style={styles.teamName} numberOfLines={1}>{item.homeTeam?.name}</Text>
        {renderScore(item)}
        <Text style={[styles.teamName, styles.awayTeam]} numberOfLines={1}>
          {item.awayTeam?.name}
        </Text>
      </View>
    </View>
  );

  // Состояния
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => fetchMatches()}>
          <Text style={styles.retryText}>Повторить</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Матчи тура</Text>
        <UpdatedAgo since={lastUpdated} />
      </View>

      {/* Фильтры */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.filterButton, filter === f.key && styles.filterButtonActive]}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Список */}
      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchMatches(true)} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Матчей пока нет</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterButtonActive: { backgroundColor: '#2563eb' },
  filterText: { color: '#4b5563', fontSize: 14, fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  status: { fontSize: 13, color: '#2563eb', fontWeight: '600', marginBottom: 2 },
  date: { fontSize: 13, color: '#6b7280' },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  awayTeam: { textAlign: 'right' },
  score: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 16,
    minWidth: 50,
    textAlign: 'center',
  },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: '#6b7280' },
  errorText: { fontSize: 16, color: '#ef4444', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
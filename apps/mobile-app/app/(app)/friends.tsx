import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { Colors } from '@/constants/theme';
import { calculateFriendBalances } from '@/lib/balance';
import { subscribeToGroupExpenses, subscribeToUserGroups } from '@/lib/firestore';
import { formatAmount } from '@/lib/types';
import type { Expense, FriendBalance, Group } from '@/lib/types';

function BalanceBanner({ owedEntries, oweEntries }: {
  owedEntries: [string, number][];
  oweEntries:  [string, number][];
}) {
  const fmt = (entries: [string, number][]) =>
    entries.map(([cur, amt]) => formatAmount(Math.abs(amt), cur)).join(' + ');
  if (owedEntries.length > 0 && oweEntries.length > 0) {
    return (
      <View>
        <Text style={[styles.headerSub, { color: Colors.primary }]}>You are owed {fmt(owedEntries)}</Text>
        <Text style={[styles.headerSub, { color: Colors.danger }]}>You owe {fmt(oweEntries)}</Text>
      </View>
    );
  }
  if (owedEntries.length > 0)
    return <Text style={[styles.headerSub, { color: Colors.primary }]}>You are owed {fmt(owedEntries)}</Text>;
  return <Text style={[styles.headerSub, { color: Colors.danger }]}>You owe {fmt(oweEntries)}</Text>;
}

export default function FriendsScreen() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendBalance[]>([]);
  const [currentGroups, setCurrentGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const expenseUnsubs: (() => void)[] = [];
    const groupExpensesMap: Record<string, Expense[]> = {};
    let currentGroups: Group[] = [];

    const unsubGroups = subscribeToUserGroups(user.uid, (fetchedGroups) => {
      currentGroups = fetchedGroups;
      setCurrentGroups(fetchedGroups);
      expenseUnsubs.forEach((u) => u());
      expenseUnsubs.length = 0;

      if (fetchedGroups.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      let resolved = 0;
      for (const group of fetchedGroups) {
        const unsub = subscribeToGroupExpenses(group.id, (expenses) => {
          groupExpensesMap[group.id] = expenses;
          resolved += 1;
          if (resolved >= currentGroups.length) {
            const computed = calculateFriendBalances(currentGroups, groupExpensesMap, user.uid);
            computed.sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount));
            setFriends(computed);
            setLoading(false);
          }
        });
        expenseUnsubs.push(unsub);
      }
    });

    return () => {
      unsubGroups();
      expenseUnsubs.forEach((u) => u());
    };
  }, [user]);

  const groupCurrencyMap = currentGroups.reduce<Record<string, string>>((acc, g) => {
    acc[g.id] = g.currency;
    return acc;
  }, {});
  const perCurrencyBalance = friends.reduce<Record<string, number>>((acc, friend) => {
    for (const g of friend.groups) {
      const currency = groupCurrencyMap[g.groupId];
      if (currency && Math.abs(g.amount) > 0.001) {
        acc[currency] = (acc[currency] ?? 0) + g.amount;
      }
    }
    return acc;
  }, {});
  const owedEntries = Object.entries(perCurrencyBalance).filter(([, v]) => v >  0.001);
  const oweEntries  = Object.entries(perCurrencyBalance).filter(([, v]) => v < -0.001);

  function renderFriend({ item }: { item: FriendBalance }) {
    const isPositive = item.netAmount > 0;
    const initials = item.displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <View style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.uid) }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.friendName}>{item.displayName}</Text>
          {item.groups.map((g) => (
            <Text key={g.groupId} style={styles.groupLine} numberOfLines={1}>
              {g.groupName}:{' '}
              <Text style={{ color: g.amount > 0 ? Colors.primary : Colors.danger }}>
                {g.amount > 0 ? 'owes you' : 'you owe'}{' '}
                {formatAmount(g.amount, groupCurrencyMap[g.groupId] ?? '')}
              </Text>
            </Text>
          ))}
        </View>
        <View style={styles.cardRight}>
          {Object.entries(
            item.groups.reduce<Record<string, number>>((acc, g) => {
              const cur = groupCurrencyMap[g.groupId];
              if (cur) acc[cur] = (acc[cur] ?? 0) + g.amount;
              return acc;
            }, {})
          ).map(([cur, amt]) => (
            <View key={cur} style={{ alignItems: 'flex-end', marginBottom: 2 }}>
              <Text style={styles.balanceLabel}>{amt > 0 ? 'owes you' : 'you owe'}</Text>
              <Text style={[styles.balanceAmount, { color: amt > 0 ? Colors.primary : Colors.danger }]}>
                {formatAmount(Math.abs(amt), cur)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
        {!loading && friends.length > 0 && (owedEntries.length > 0 || oweEntries.length > 0) && (
          <BalanceBanner owedEntries={owedEntries} oweEntries={oweEntries} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : friends.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={64} color={Colors.light.border} />
          <Text style={styles.emptyTitle}>No balances yet</Text>
          <Text style={styles.emptyText}>
            Add friends to groups and start splitting expenses together
          </Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.uid}
          renderItem={renderFriend}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const AVATAR_COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

function getAvatarColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.light.text },
  headerSub: { fontSize: 13, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  cardBody: { flex: 1 },
  friendName: { fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 3 },
  groupLine: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 1 },
  cardRight: { alignItems: 'flex-end' },
  balanceLabel: { fontSize: 11, color: Colors.light.textSecondary, marginBottom: 2 },
  balanceAmount: { fontSize: 15, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center', lineHeight: 20 },
});

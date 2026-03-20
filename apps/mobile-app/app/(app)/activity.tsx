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
import { subscribeToGroupExpenses, subscribeToUserGroups } from '@/lib/firestore';
import { formatAmount } from '@/lib/types';
import type { Expense, Group } from '@/lib/types';

interface ActivityItem extends Expense {
  groupId: string;
  groupName: string;
  groupCurrency: string;
  memberDetails: Group['memberDetails'];
}

export default function ActivityScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const expenseUnsubs: (() => void)[] = [];
    const groupExpensesMap: Record<string, Expense[]> = {};
    let currentGroups: Group[] = [];

    function rebuildFeed() {
      const all: ActivityItem[] = [];
      for (const group of currentGroups) {
        const exps = groupExpensesMap[group.id] ?? [];
        for (const exp of exps) {
          all.push({
            ...exp,
            groupId: group.id,
            groupName: group.name,
            groupCurrency: group.currency,
            memberDetails: group.memberDetails,
          });
        }
      }
      all.sort((a, b) => {
        const aTime = a.date?.toMillis?.() ?? 0;
        const bTime = b.date?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
      setItems(all);
      setLoading(false);
    }

    const unsubGroups = subscribeToUserGroups(user.uid, (fetchedGroups) => {
      currentGroups = fetchedGroups;
      expenseUnsubs.forEach((u) => u());
      expenseUnsubs.length = 0;

      if (fetchedGroups.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      for (const group of fetchedGroups) {
        groupExpensesMap[group.id] = [];
        const unsub = subscribeToGroupExpenses(group.id, (expenses) => {
          groupExpensesMap[group.id] = expenses;
          rebuildFeed();
        });
        expenseUnsubs.push(unsub);
      }
    });

    return () => {
      unsubGroups();
      expenseUnsubs.forEach((u) => u());
    };
  }, [user]);

  function renderItem({ item }: { item: ActivityItem }) {
    const isPaidByMe = item.paidBy === user?.uid;
    const paidByName = isPaidByMe
      ? 'You'
      : (item.memberDetails[item.paidBy]?.displayName ?? item.paidBy);
    const myShare = item.splits[user?.uid ?? ''] ?? 0;
    const myLent = isPaidByMe
      ? Object.values(item.splits).reduce((s, v) => s + v, 0)
      : 0;

    let statusText = '';
    let statusColor = Colors.light.textSecondary;
    if (isPaidByMe && myLent > 0) {
      statusText = `You get back ${formatAmount(myLent, item.groupCurrency)}`;
      statusColor = Colors.primary;
    } else if (!isPaidByMe && myShare > 0) {
      statusText = `You owe ${formatAmount(myShare, item.groupCurrency)}`;
      statusColor = Colors.danger;
    } else {
      statusText = 'You do not owe anything';
    }

    const dateStr = item.date?.toDate
      ? item.date.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';

    return (
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.description}>
            <Text style={{ fontWeight: '700' }}>
              {paidByName} added &quot;{item.description}&quot;
            </Text>
            {' in '}
            <Text style={{ fontWeight: '600', color: Colors.primary }}>{item.groupName}</Text>
          </Text>
          <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="pulse-outline" size={64} color={Colors.light.border} />
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptyText}>Expenses across your groups will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.groupId}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  description: { fontSize: 14, color: Colors.light.text, lineHeight: 20, marginBottom: 4 },
  status: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  date: { fontSize: 11, color: Colors.light.textSecondary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center', lineHeight: 20 },
});

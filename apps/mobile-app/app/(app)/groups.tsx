import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { Colors } from '@/constants/theme';
import { subscribeToGroupExpenses, subscribeToUserGroups } from '@/lib/firestore';
import { getGroupNetBalance } from '@/lib/balance';
import { formatAmount } from '@/lib/types';
import type { Expense, Group } from '@/lib/types';

type GroupWithBalance = Group & { netBalance: number };

export default function GroupsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const expenseUnsubs: (() => void)[] = [];
    const groupExpenses: Record<string, Expense[]> = {};
    let currentGroups: Group[] = [];

    const unsubGroups = subscribeToUserGroups(user.uid, (fetchedGroups) => {
      currentGroups = fetchedGroups;

      expenseUnsubs.forEach((u) => u());
      expenseUnsubs.length = 0;

      if (fetchedGroups.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      let resolved = 0;
      for (const group of fetchedGroups) {
        const unsub = subscribeToGroupExpenses(group.id, (expenses) => {
          groupExpenses[group.id] = expenses;
          resolved += 1;
          if (resolved >= currentGroups.length) {
            const withBalance = currentGroups.map((g) => ({
              ...g,
              netBalance: getGroupNetBalance(groupExpenses[g.id] ?? [], user.uid),
            }));
            setGroups(withBalance);
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

  const overallBalance = groups.reduce((sum, g) => sum + g.netBalance, 0);

  function renderItem({ item }: { item: GroupWithBalance }) {
    const isPositive = item.netBalance >= 0;
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
        onPress={() => router.push(`/group/${item.id}`)}
      >
        <View style={[styles.groupIcon, { backgroundColor: getCategoryColor(item.category) }]}>
          <Ionicons name={getCategoryIcon(item.category)} size={22} color="#FFF" />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.groupMeta}>
            {item.members.length} member{item.members.length !== 1 ? 's' : ''} · {item.currency}
          </Text>
        </View>
        <View style={styles.cardRight}>
          {item.netBalance === 0 ? (
            <Text style={styles.settled}>settled up</Text>
          ) : (
            <>
              <Text style={styles.balanceLabel}>{isPositive ? 'you are owed' : 'you owe'}</Text>
              <Text style={[styles.balanceAmount, { color: isPositive ? Colors.primary : Colors.danger }]}>
                {formatAmount(item.netBalance, item.currency)}
              </Text>
            </>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Groups</Text>
          {!loading && (
            <Text style={[styles.headerSub, { color: overallBalance >= 0 ? Colors.primary : Colors.danger }]}>
              {overallBalance === 0
                ? 'All settled up'
                : overallBalance > 0
                  ? `Overall you are owed`
                  : `Overall you owe`}
            </Text>
          )}
        </View>
        <Pressable style={styles.createBtn} onPress={() => router.push('/create-group')}>
          <Ionicons name="add" size={22} color="#FFF" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="albums-outline" size={64} color={Colors.light.border} />
          <Text style={styles.emptyTitle}>No groups yet</Text>
          <Text style={styles.emptyText}>Create a group to start splitting expenses</Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.push('/create-group')}>
            <Text style={styles.emptyBtnText}>Create Group</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    trip: '#6366F1',
    home: '#F59E0B',
    couple: '#EC4899',
    other: '#8B5CF6',
  };
  return map[category] ?? '#8B5CF6';
}

function getCategoryIcon(category: string): React.ComponentProps<typeof Ionicons>['name'] {
  const map: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
    trip: 'airplane',
    home: 'home',
    couple: 'heart',
    other: 'apps',
  };
  return map[category] ?? 'apps';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.light.text },
  headerSub: { fontSize: 13, marginTop: 2 },
  createBtn: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  groupIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 3 },
  groupMeta: { fontSize: 12, color: Colors.light.textSecondary },
  cardRight: { alignItems: 'flex-end' },
  balanceLabel: { fontSize: 11, color: Colors.light.textSecondary, marginBottom: 2 },
  balanceAmount: { fontSize: 15, fontWeight: '700' },
  settled: { fontSize: 12, color: Colors.light.textSecondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

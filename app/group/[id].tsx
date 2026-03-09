import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { Colors } from '@/constants/theme';
import {
  calculateGroupBalances,
  calculateMemberNetBalances,
} from '@/lib/balance';
import {
  addSettlement,
  createInvite,
  deleteExpense,
  subscribeToGroup,
  subscribeToGroupExpenses,
  subscribeToGroupSettlements,
  updateGroupWhiteboard,
} from '@/lib/firestore';
import { formatAmount, CURRENCY_SYMBOLS } from '@/lib/types';
import type { Balance, Expense, Group, MemberNetBalance, Settlement } from '@/lib/types';

const WEB_APP_URL = 'https://split-it-web.vercel.app';

type OverlayType = 'settle' | 'charts' | 'balances' | 'totals' | 'whiteboard' | 'expense' | null;

interface SettleTarget {
  uid: string;
  displayName: string;
  amount: number;
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [memberTotals, setMemberTotals] = useState<MemberNetBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const [overlay, setOverlay] = useState<OverlayType>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Settle Up state
  const [settleTarget, setSettleTarget] = useState<SettleTarget | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [settling, setSettling] = useState(false);

  // Whiteboard state
  const [whiteboardText, setWhiteboardText] = useState('');
  const whiteboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsubGroup = subscribeToGroup(id, (g) => {
      setGroup(g);
      if (g) {
        navigation.setOptions({ title: g.name });
        setWhiteboardText(g.whiteboard ?? '');
      }
    });
    const unsubExpenses = subscribeToGroupExpenses(id, (exps) => {
      setExpenses(exps);
      setLoading(false);
    });
    const unsubSettlements = subscribeToGroupSettlements(id, (setts) => {
      setSettlements(setts);
    });
    return () => {
      unsubGroup();
      unsubExpenses();
      unsubSettlements();
    };
  }, [id]);

  useEffect(() => {
    if (!group || !user) return;
    setBalances(calculateGroupBalances(expenses, user.uid, group.memberDetails, settlements));
    setMemberTotals(calculateMemberNetBalances(expenses, settlements, group.memberDetails));
  }, [expenses, settlements, group, user]);

  async function handleInvite() {
    if (!group || !user) return;
    try {
      const token = await createInvite(group, user.uid, group.inviteToken);
      const url = `${WEB_APP_URL}/join/${token}`;
      await Share.share({ message: `Join my group "${group.name}" on Split-It: ${url}`, url });
    } catch {
      Alert.alert('Error', 'Could not generate invite link');
    }
  }

  function openSettleTarget(b: Balance) {
    setSettleTarget(b);
    setSettleAmount(Math.abs(b.amount).toFixed(2));
    setSettleNote('');
  }

  async function handleSettle() {
    if (!group || !user || !settleTarget) return;
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    setSettling(true);
    try {
      // from = the debtor (person paying), to = the creditor (person receiving)
      const isDebtor = settleTarget.amount > 0; // they owe me → I am creditor, they are debtor
      const from = isDebtor ? settleTarget.uid : user.uid;
      const to = isDebtor ? user.uid : settleTarget.uid;
      await addSettlement(group.id, from, to, amt, settleNote.trim() || undefined);
      setSettleTarget(null);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to record payment');
    } finally {
      setSettling(false);
    }
  }

  function handleWhiteboardChange(text: string) {
    setWhiteboardText(text);
    if (whiteboardTimer.current) clearTimeout(whiteboardTimer.current);
    whiteboardTimer.current = setTimeout(() => {
      if (group) updateGroupWhiteboard(group.id, text).catch(() => {});
    }, 800);
  }

  function handleExport() {
    if (!group || expenses.length === 0) {
      Alert.alert('Nothing to export', 'Add some expenses first.');
      return;
    }
    const memberCols = group.members.map((uid) => group.memberDetails[uid]?.displayName ?? uid);
    const header = ['Date', 'Description', 'Total', 'Paid By', ...memberCols].join(',');
    const rows = expenses.map((exp) => {
      const date = exp.date?.toDate?.().toLocaleDateString('en-IN') ?? '';
      const paidByName = group.memberDetails[exp.paidBy]?.displayName ?? exp.paidBy;
      const shareCols = group.members.map((uid) => {
        const share = exp.splits[uid] ?? 0;
        return share > 0 ? share.toFixed(2) : '0.00';
      });
      return [date, `"${exp.description}"`, exp.amount.toFixed(2), paidByName, ...shareCols].join(',');
    });
    const csv = [header, ...rows].join('\n');
    Share.share({ message: csv, title: `${group.name} expenses.csv` });
  }

  if (loading || !group) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const overallNet = balances.reduce((s, b) => s + b.amount, 0);
  const symbol = CURRENCY_SYMBOLS[group.currency] ?? group.currency;
  const totalSpend = expenses.reduce((s, e) => s + e.amount, 0);
  const myMemberTotal = memberTotals.find((m) => m.uid === user?.uid);
  const mySharePct = totalSpend > 0 && myMemberTotal ? (myMemberTotal.totalOwed / totalSpend) * 100 : 0;

  // For charts: per-member paid percentage
  const maxPaid = Math.max(...memberTotals.map((m) => m.totalPaid), 1);

  function renderExpense({ item }: { item: Expense }) {
    const isPaidByMe = item.paidBy === user?.uid;
    const paidByName = group!.memberDetails[item.paidBy]?.displayName ?? item.paidBy;
    const myShare = item.splits[user?.uid ?? ''] ?? 0;
    const splitTotal = Object.values(item.splits).reduce((s, v) => s + v, 0);
    const myLent = isPaidByMe ? splitTotal : 0;
    const isInvolved = isPaidByMe || myShare > 0;

    return (
      <Pressable
        style={({ pressed }) => [styles.expenseCard, pressed && { opacity: 0.75 }]}
        onPress={() => { setSelectedExpense(item); setOverlay('expense'); }}
      >
        <View style={styles.expenseIcon}>
          <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
        </View>
        <View style={styles.expenseBody}>
          <Text style={styles.expenseName} numberOfLines={1}>{item.description}</Text>
          <Text style={styles.expensePaidBy}>
            {isPaidByMe ? 'You' : paidByName} paid {formatAmount(item.amount, group!.currency)}
          </Text>
        </View>
        <View style={styles.expenseRight}>
          {!isInvolved ? (
            <Text style={styles.notInvolved}>not involved</Text>
          ) : isPaidByMe ? (
            <>
              <Text style={styles.lentLabel}>you lent</Text>
              <Text style={[styles.lentAmount, { color: Colors.primary }]}>{formatAmount(myLent, group!.currency)}</Text>
            </>
          ) : (
            <>
              <Text style={styles.borrowedLabel}>you borrowed</Text>
              <Text style={[styles.borrowedAmount, { color: Colors.danger }]}>{formatAmount(myShare, group!.currency)}</Text>
            </>
          )}
        </View>
        <Ionicons name="chevron-forward" size={14} color={Colors.light.border} style={{ marginLeft: 2 }} />
      </Pressable>
    );
  }

  const ACTION_BTNS = [
    { key: 'settle', icon: 'cash-outline', label: 'Settle Up' },
    { key: 'charts', icon: 'bar-chart-outline', label: 'Charts' },
    { key: 'balances', icon: 'people-outline', label: 'Balances' },
    { key: 'totals', icon: 'calculator-outline', label: 'Totals' },
    { key: 'whiteboard', icon: 'create-outline', label: 'Whiteboard' },
    { key: 'export', icon: 'download-outline', label: 'Export' },
  ] as const;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpense}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {/* Summary card */}
            <View style={styles.summaryCard}>
              {overallNet === 0 ? (
                <Text style={styles.settledText}>All settled up in this group</Text>
              ) : (
                <>
                  <Text style={styles.summaryLabel}>{overallNet > 0 ? 'You are owed' : 'You owe'} overall</Text>
                  <Text style={[styles.summaryAmount, { color: overallNet > 0 ? Colors.primary : Colors.danger }]}>
                    {formatAmount(overallNet, group.currency)}
                  </Text>
                </>
              )}
              {balances.length > 0 && (
                <View style={styles.balanceList}>
                  {balances.map((b) => (
                    <Text key={b.uid} style={styles.balanceItem}>
                      <Text style={{ fontWeight: '600' }}>{b.displayName}</Text>
                      {b.amount > 0
                        ? ` owes you ${formatAmount(b.amount, group.currency)}`
                        : ` you owe ${formatAmount(b.amount, group.currency)}`}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {/* Primary actions: Invite + Add Expense */}
            <View style={styles.primaryActions}>
              <Pressable style={styles.inviteBtn} onPress={handleInvite}>
                <Ionicons name="person-add-outline" size={18} color={Colors.primary} />
                <Text style={styles.inviteBtnText}>Invite Member</Text>
              </Pressable>
              <Pressable
                style={styles.addExpenseBtn}
                onPress={() => router.push({ pathname: '/add-expense', params: { groupId: id } })}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                <Text style={styles.addExpenseBtnText}>Add Expense</Text>
              </Pressable>
            </View>

            {/* Secondary feature chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsRow} contentContainerStyle={styles.actionsContent}>
              {ACTION_BTNS.map(({ key, icon, label }) => (
                <Pressable
                  key={key}
                  style={styles.actionChip}
                  onPress={() => key === 'export' ? handleExport() : setOverlay(key as OverlayType)}
                >
                  <Ionicons name={icon as never} size={16} color={Colors.primary} />
                  <Text style={styles.actionChipText}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.expensesSectionTitle}>Expenses</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyExpenses}>
            <Ionicons name="receipt-outline" size={40} color={Colors.light.border} />
            <Text style={styles.emptyExpensesText}>No expenses yet</Text>
          </View>
        }
      />

      {/* ══════════ SETTLE UP OVERLAY ══════════ */}
      {overlay === 'settle' && (
        <View style={styles.overlay}>
          <View style={styles.overlayHeader}>
            <Pressable onPress={() => { setOverlay(null); setSettleTarget(null); }} hitSlop={12}>
              <Text style={styles.overlayClose}>✕</Text>
            </Pressable>
            <Text style={styles.overlayTitle}>Settle Up</Text>
            <View style={{ width: 32 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.overlayContent}>
            {balances.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={56} color={Colors.primary} />
                <Text style={styles.emptyStateTitle}>All settled up!</Text>
                <Text style={styles.emptyStateText}>No outstanding balances in this group.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.overlaySubtitle}>Which balance do you want to settle?</Text>
                {balances.map((b) => (
                  <Pressable
                    key={b.uid}
                    style={[styles.settleRow, settleTarget?.uid === b.uid && styles.settleRowActive]}
                    onPress={() => openSettleTarget(b)}
                  >
                    <View style={styles.memberAvatarLg}>
                      <Text style={styles.memberAvatarLgText}>{b.displayName[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.settleRowName}>{b.displayName}</Text>
                      <Text style={[styles.settleRowAmount, { color: b.amount > 0 ? Colors.primary : Colors.danger }]}>
                        {b.amount > 0 ? 'owes you' : 'you owe'} {formatAmount(b.amount, group.currency)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.light.textSecondary} />
                  </Pressable>
                ))}
              </>
            )}
          </ScrollView>

          {/* Record payment form */}
          {settleTarget && (
            <View style={styles.recordPaymentPanel}>
              <Text style={styles.recordPaymentTitle}>Record a payment</Text>
              <Text style={styles.recordPaymentSub}>
                {settleTarget.amount > 0 ? `${settleTarget.displayName} pays you` : `You pay ${settleTarget.displayName}`}
              </Text>
              <View style={styles.recordAmountRow}>
                <Text style={styles.recordCurrency}>{symbol}</Text>
                <TextInput
                  style={styles.recordAmountInput}
                  value={settleAmount}
                  onChangeText={setSettleAmount}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
              </View>
              <TextInput
                style={styles.recordNoteInput}
                value={settleNote}
                onChangeText={setSettleNote}
                placeholder="Add a note (optional)"
                placeholderTextColor={Colors.light.textSecondary}
              />
              <Pressable
                style={[styles.recordSaveBtn, settling && { opacity: 0.6 }]}
                onPress={handleSettle}
                disabled={settling}
              >
                <Text style={styles.recordSaveBtnText}>{settling ? 'Saving…' : 'Record Payment'}</Text>
              </Pressable>
              <Pressable onPress={() => setSettleTarget(null)} style={{ alignItems: 'center', marginTop: 8 }}>
                <Text style={{ color: Colors.light.textSecondary, fontSize: 13 }}>Cancel</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* ══════════ CHARTS OVERLAY ══════════ */}
      {overlay === 'charts' && (
        <View style={styles.overlay}>
          <View style={styles.overlayHeader}>
            <Pressable onPress={() => setOverlay(null)} hitSlop={12}>
              <Text style={styles.overlayClose}>✕</Text>
            </Pressable>
            <Text style={styles.overlayTitle}>Charts</Text>
            <View style={{ width: 32 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.overlayContent}>
            {/* Summary stat */}
            <View style={styles.chartStatCard}>
              <Text style={styles.chartStatLabel}>Total Group Spending</Text>
              <Text style={styles.chartStatValue}>{formatAmount(totalSpend, group.currency)}</Text>
              <Text style={styles.chartStatSub}>{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</Text>
            </View>

            {/* Per-member paid bar chart */}
            <Text style={styles.chartSectionTitle}>Amount Paid by Each Member</Text>
            {memberTotals.map((m) => {
              const pct = maxPaid > 0 ? (m.totalPaid / maxPaid) * 100 : 0;
              const isMe = m.uid === user?.uid;
              return (
                <View key={m.uid} style={styles.barRow}>
                  <View style={styles.barLabelWrap}>
                    <Text style={styles.barName}>{isMe ? 'You' : m.displayName}</Text>
                    <Text style={styles.barAmount}>{formatAmount(m.totalPaid, group.currency)}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%` as unknown as number, backgroundColor: isMe ? Colors.primary : Colors.primary + '88' }]} />
                  </View>
                </View>
              );
            })}

            {/* Per-member owed bar chart */}
            <Text style={[styles.chartSectionTitle, { marginTop: 24 }]}>Amount Spent by Each Member</Text>
            {memberTotals.map((m) => {
              const maxOwed = Math.max(...memberTotals.map((x) => x.totalOwed), 1);
              const pct = (m.totalOwed / maxOwed) * 100;
              const isMe = m.uid === user?.uid;
              return (
                <View key={m.uid} style={styles.barRow}>
                  <View style={styles.barLabelWrap}>
                    <Text style={styles.barName}>{isMe ? 'You' : m.displayName}</Text>
                    <Text style={styles.barAmount}>{formatAmount(m.totalOwed, group.currency)}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%` as unknown as number, backgroundColor: isMe ? Colors.danger : Colors.danger + '88' }]} />
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ══════════ BALANCES OVERLAY ══════════ */}
      {overlay === 'balances' && (
        <View style={styles.overlay}>
          <View style={styles.overlayHeader}>
            <Pressable onPress={() => setOverlay(null)} hitSlop={12}>
              <Text style={styles.overlayClose}>✕</Text>
            </Pressable>
            <Text style={styles.overlayTitle}>Group Balances</Text>
            <View style={{ width: 32 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.overlayContent}>
            {memberTotals.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No expenses yet</Text>
              </View>
            ) : (
              memberTotals.map((m) => {
                const isMe = m.uid === user?.uid;
                // Who owes/gets from this member — from their perspective
                const memberBalances = calculateGroupBalances(expenses, m.uid, group.memberDetails, settlements);
                return (
                  <View key={m.uid} style={styles.balanceMemberCard}>
                    <View style={styles.balanceMemberHeader}>
                      <View style={styles.memberAvatarLg}>
                        <Text style={styles.memberAvatarLgText}>{m.displayName[0]?.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.balanceMemberName}>{isMe ? 'You' : m.displayName}</Text>
                        {m.net > 0.001 ? (
                          <Text style={[styles.balanceMemberNet, { color: Colors.primary }]}>
                            gets back {formatAmount(m.net, group.currency)} in total
                          </Text>
                        ) : m.net < -0.001 ? (
                          <Text style={[styles.balanceMemberNet, { color: Colors.danger }]}>
                            owes {formatAmount(m.net, group.currency)} in total
                          </Text>
                        ) : (
                          <Text style={styles.balanceMemberNet}>settled up</Text>
                        )}
                      </View>
                    </View>
                    {memberBalances.filter((b) => b.amount > 0).map((b) => (
                      <View key={b.uid} style={styles.balancePairRow}>
                        <Text style={styles.balancePairText}>
                          <Text style={{ fontWeight: '600' }}>{b.displayName}</Text>
                          {' owes '}<Text style={{ color: Colors.primary, fontWeight: '600' }}>{formatAmount(b.amount, group.currency)}</Text>
                          {' to '}<Text style={{ fontWeight: '600' }}>{isMe ? 'you' : m.displayName}</Text>
                        </Text>
                        {isMe && (
                          <Pressable
                            style={styles.settleSmallBtn}
                            onPress={() => { setOverlay('settle'); openSettleTarget(b); }}
                          >
                            <Text style={styles.settleSmallBtnText}>Settle up</Text>
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {/* ══════════ TOTALS OVERLAY ══════════ */}
      {overlay === 'totals' && (
        <View style={styles.overlay}>
          <View style={styles.overlayHeader}>
            <Pressable onPress={() => setOverlay(null)} hitSlop={12}>
              <Text style={styles.overlayClose}>✕</Text>
            </Pressable>
            <Text style={styles.overlayTitle}>Totals</Text>
            <View style={{ width: 32 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.overlayContent}>
            {/* Group total */}
            <View style={styles.totalHeroCard}>
              <Text style={styles.totalHeroLabel}>{group.name}</Text>
              <Text style={styles.totalHeroSub}>All-time group spending</Text>
              <Text style={styles.totalHeroAmount}>{formatAmount(totalSpend, group.currency)}</Text>
              {myMemberTotal && (
                <>
                  <View style={styles.totalDivider} />
                  <View style={styles.totalMyShare}>
                    <View style={styles.totalMyShareDot} />
                    <Text style={styles.totalMyShareLabel}>Total spent</Text>
                    <Text style={styles.totalMyShareValue}>{formatAmount(totalSpend, group.currency)}</Text>
                  </View>
                  <View style={styles.totalMyShare}>
                    <View style={[styles.totalMyShareDot, { backgroundColor: Colors.danger }]} />
                    <Text style={styles.totalMyShareLabel}>Your share</Text>
                    <Text style={styles.totalMyShareValue}>{formatAmount(myMemberTotal.totalOwed, group.currency)}</Text>
                  </View>
                  <Text style={styles.totalSharePct}>{mySharePct.toFixed(0)}% of total group spending</Text>
                </>
              )}
            </View>

            <Text style={styles.chartSectionTitle}>Per Member</Text>
            {memberTotals.map((m) => {
              const isMe = m.uid === user?.uid;
              return (
                <View key={m.uid} style={styles.totalMemberCard}>
                  <View style={styles.memberAvatarLg}>
                    <Text style={styles.memberAvatarLgText}>{m.displayName[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.totalMemberName}>{isMe ? 'You' : m.displayName}</Text>
                    <Text style={styles.totalMemberSub}>Paid: {formatAmount(m.totalPaid, group.currency)} · Spent: {formatAmount(m.totalOwed, group.currency)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {m.net > 0.001 ? (
                      <>
                        <Text style={styles.totalNetLabelGreen}>gets back</Text>
                        <Text style={[styles.totalNetAmount, { color: Colors.primary }]}>{formatAmount(m.net, group.currency)}</Text>
                      </>
                    ) : m.net < -0.001 ? (
                      <>
                        <Text style={styles.totalNetLabelRed}>owes</Text>
                        <Text style={[styles.totalNetAmount, { color: Colors.danger }]}>{formatAmount(m.net, group.currency)}</Text>
                      </>
                    ) : (
                      <Text style={{ fontSize: 12, color: Colors.light.textSecondary }}>settled</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ══════════ WHITEBOARD OVERLAY ══════════ */}
      {overlay === 'whiteboard' && (
        <View style={styles.overlay}>
          <View style={styles.overlayHeader}>
            <Pressable onPress={() => setOverlay(null)} hitSlop={12}>
              <Text style={styles.overlayClose}>✕</Text>
            </Pressable>
            <Text style={styles.overlayTitle}>Whiteboard</Text>
            <Text style={styles.overlayAutoSave}>Auto-saves</Text>
          </View>
          <View style={styles.whiteboardContainer}>
            <TextInput
              style={styles.whiteboardInput}
              value={whiteboardText}
              onChangeText={handleWhiteboardChange}
              placeholder="Write shared notes for this group… visible to all members in real-time."
              placeholderTextColor={Colors.light.textSecondary}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </View>
          <View style={styles.whiteboardFooter}>
            <Ionicons name="sync-outline" size={14} color={Colors.light.textSecondary} />
            <Text style={styles.whiteboardFooterText}>Changes are visible to all group members instantly</Text>
          </View>
        </View>
      )}

      {/* ══════════ EXPENSE DETAIL OVERLAY ══════════ */}
      {overlay === 'expense' && selectedExpense && (
        <View style={styles.overlay}>
          <View style={styles.overlayHeader}>
            <Pressable onPress={() => { setOverlay(null); setSelectedExpense(null); }} hitSlop={12}>
              <Text style={styles.overlayClose}>✕</Text>
            </Pressable>
            <Text style={styles.overlayTitle}>Expense Details</Text>
            <View style={{ width: 32 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.overlayContent}>
            {/* Hero card */}
            <View style={styles.expDetailHero}>
              <View style={styles.expDetailIconLg}>
                <Ionicons name="receipt-outline" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.expDetailDesc}>{selectedExpense.description}</Text>
              <Text style={styles.expDetailAmount}>{formatAmount(selectedExpense.amount, group.currency)}</Text>
              <Text style={styles.expDetailDate}>
                {selectedExpense.date?.toDate?.().toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'long', year: 'numeric',
                }) ?? ''}
              </Text>
            </View>

            {/* Paid by */}
            <View style={styles.expDetailSection}>
              <Text style={styles.expDetailSectionTitle}>PAID BY</Text>
              <View style={styles.expDetailRow}>
                <View style={styles.expDetailAvatar}>
                  <Text style={styles.expDetailAvatarText}>
                    {(selectedExpense.paidBy === user?.uid ? 'You' : (group.memberDetails[selectedExpense.paidBy]?.displayName ?? selectedExpense.paidBy))[0]?.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.expDetailRowName}>
                  {selectedExpense.paidBy === user?.uid ? 'You' : (group.memberDetails[selectedExpense.paidBy]?.displayName ?? selectedExpense.paidBy)}
                </Text>
                <Text style={[styles.expDetailRowAmount, { color: Colors.primary }]}>
                  {formatAmount(selectedExpense.amount, group.currency)}
                </Text>
              </View>
            </View>

            {/* Split breakdown */}
            <View style={styles.expDetailSection}>
              <Text style={styles.expDetailSectionTitle}>SPLIT</Text>
              {/* Payer's own share */}
              {(() => {
                const splitTotal = Object.values(selectedExpense.splits).reduce((s, v) => s + v, 0);
                const payerShare = selectedExpense.amount - splitTotal;
                const payerName = selectedExpense.paidBy === user?.uid ? 'You' : (group.memberDetails[selectedExpense.paidBy]?.displayName ?? selectedExpense.paidBy);
                return (
                  <View style={styles.expDetailRow}>
                    <View style={styles.expDetailAvatar}>
                      <Text style={styles.expDetailAvatarText}>{payerName[0]?.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.expDetailRowName}>{payerName}</Text>
                    {payerShare > 0.001 ? (
                      <Text style={styles.expDetailRowAmount}>{formatAmount(payerShare, group.currency)}</Text>
                    ) : (
                      <Text style={[styles.expDetailRowAmount, { color: Colors.light.textSecondary }]}>paid in full</Text>
                    )}
                  </View>
                );
              })()}
              {Object.entries(selectedExpense.splits).map(([uid, amt]) => {
                const name = uid === user?.uid ? 'You' : (group.memberDetails[uid]?.displayName ?? uid);
                return (
                  <View key={uid} style={styles.expDetailRow}>
                    <View style={styles.expDetailAvatar}>
                      <Text style={styles.expDetailAvatarText}>{name[0]?.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.expDetailRowName}>{name}</Text>
                    <Text style={[styles.expDetailRowAmount, { color: Colors.danger }]}>
                      {formatAmount(amt, group.currency)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Actions */}
            <View style={styles.expDetailActions}>
              <Pressable
                style={styles.expDetailEditBtn}
                onPress={() => {
                  setOverlay(null);
                  router.push({ pathname: '/add-expense', params: { groupId: id, expenseId: selectedExpense.id } });
                }}
              >
                <Ionicons name="create-outline" size={18} color={Colors.primary} />
                <Text style={styles.expDetailEditBtnText}>Edit Expense</Text>
              </Pressable>
              <Pressable
                style={styles.expDetailDeleteBtn}
                onPress={() => {
                  Alert.alert(
                    'Delete Expense',
                    `Delete "${selectedExpense.description}"? This cannot be undone.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await deleteExpense(id!, selectedExpense.id);
                            setOverlay(null);
                            setSelectedExpense(null);
                          } catch {
                            Alert.alert('Error', 'Failed to delete expense');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                <Text style={styles.expDetailDeleteBtnText}>Delete Expense</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.light.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 32 },

  summaryCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  settledText: { fontSize: 15, color: Colors.light.textSecondary, textAlign: 'center' },
  summaryLabel: { fontSize: 13, color: Colors.light.textSecondary, marginBottom: 4 },
  summaryAmount: { fontSize: 28, fontWeight: '700' },
  balanceList: { marginTop: 12, borderTopWidth: 1, borderTopColor: Colors.light.border, paddingTop: 12, gap: 6 },
  balanceItem: { fontSize: 14, color: Colors.light.textSecondary },

  primaryActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  inviteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.light.card,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  inviteBtnText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  addExpenseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  addExpenseBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  actionsRow: { marginBottom: 20 },
  actionsContent: { gap: 8, paddingHorizontal: 0, paddingRight: 4 },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.card,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  actionChipText: { fontSize: 12, fontWeight: '600', color: Colors.light.text },

  expensesSectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.light.text, marginBottom: 10 },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  expenseIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  expenseBody: { flex: 1 },
  expenseName: { fontSize: 15, fontWeight: '600', color: Colors.light.text, marginBottom: 3 },
  expensePaidBy: { fontSize: 12, color: Colors.light.textSecondary },
  expenseRight: { alignItems: 'flex-end' },
  notInvolved: { fontSize: 12, color: Colors.light.textSecondary },
  lentLabel: { fontSize: 11, color: Colors.light.textSecondary, marginBottom: 2 },
  lentAmount: { fontSize: 14, fontWeight: '700' },
  borrowedLabel: { fontSize: 11, color: Colors.light.textSecondary, marginBottom: 2 },
  borrowedAmount: { fontSize: 14, fontWeight: '700' },
  emptyExpenses: { alignItems: 'center', paddingTop: 32, gap: 8 },
  emptyExpensesText: { fontSize: 14, color: Colors.light.textSecondary },

  // ── Overlay ──
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.light.background,
    zIndex: 100,
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  overlayTitle: { fontSize: 17, fontWeight: '700', color: Colors.light.text },
  overlayClose: { fontSize: 18, color: Colors.light.textSecondary, width: 32 },
  overlayAutoSave: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  overlayContent: { padding: 16, paddingBottom: 32, gap: 10 },
  overlaySubtitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },

  emptyState: { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyStateTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  emptyStateText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },

  // Settle Up
  settleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  settleRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  settleRowName: { fontSize: 15, fontWeight: '600', color: Colors.light.text },
  settleRowAmount: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  memberAvatarLg: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  memberAvatarLgText: { fontSize: 16, fontWeight: '700', color: Colors.primary },

  recordPaymentPanel: {
    backgroundColor: Colors.light.card,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    padding: 20,
    gap: 12,
  },
  recordPaymentTitle: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  recordPaymentSub: { fontSize: 13, color: Colors.light.textSecondary },
  recordAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordCurrency: { fontSize: 22, fontWeight: '700', color: Colors.light.textSecondary },
  recordAmountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.light.text,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingVertical: 4,
  },
  recordNoteInput: {
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.light.text,
  },
  recordSaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  recordSaveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },

  // Charts
  chartStatCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  chartStatLabel: { fontSize: 13, color: Colors.light.textSecondary, marginBottom: 4 },
  chartStatValue: { fontSize: 32, fontWeight: '700', color: Colors.light.text },
  chartStatSub: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 4 },
  chartSectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.light.text, marginBottom: 8, marginTop: 4 },
  barRow: { marginBottom: 12 },
  barLabelWrap: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  barName: { fontSize: 14, fontWeight: '500', color: Colors.light.text },
  barAmount: { fontSize: 13, fontWeight: '600', color: Colors.light.textSecondary },
  barTrack: { height: 10, backgroundColor: Colors.light.border, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },

  // Balances
  balanceMemberCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 8,
  },
  balanceMemberHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  balanceMemberName: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  balanceMemberNet: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  balancePairRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 56, gap: 8 },
  balancePairText: { flex: 1, fontSize: 13, color: Colors.light.textSecondary },
  settleSmallBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary },
  settleSmallBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },

  // Totals
  totalHeroCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 6,
  },
  totalHeroLabel: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  totalHeroSub: { fontSize: 12, color: Colors.light.textSecondary },
  totalHeroAmount: { fontSize: 40, fontWeight: '700', color: Colors.light.text, marginTop: 8 },
  totalDivider: { width: '100%', height: 1, backgroundColor: Colors.light.border, marginVertical: 8 },
  totalMyShare: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  totalMyShareDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  totalMyShareLabel: { flex: 1, fontSize: 14, color: Colors.light.textSecondary },
  totalMyShareValue: { fontSize: 14, fontWeight: '700', color: Colors.light.text },
  totalSharePct: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 4 },
  totalMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  totalMemberName: { fontSize: 15, fontWeight: '600', color: Colors.light.text },
  totalMemberSub: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  totalNetLabelGreen: { fontSize: 11, color: Colors.primary },
  totalNetLabelRed: { fontSize: 11, color: Colors.danger },
  totalNetAmount: { fontSize: 15, fontWeight: '700' },

  // Whiteboard
  whiteboardContainer: { flex: 1, padding: 16 },
  whiteboardInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 26,
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minHeight: 300,
  },
  whiteboardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  whiteboardFooterText: { fontSize: 12, color: Colors.light.textSecondary },

  // Expense Detail
  expDetailHero: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 12,
  },
  expDetailIconLg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  expDetailDesc: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 4, textAlign: 'center', paddingHorizontal: 16 },
  expDetailAmount: { fontSize: 36, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  expDetailDate: { fontSize: 13, color: Colors.light.textSecondary },
  expDetailSection: {
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  expDetailSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  expDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  expDetailAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expDetailAvatarText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  expDetailRowName: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.light.text },
  expDetailRowAmount: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  expDetailActions: { gap: 10, marginTop: 4, marginBottom: 24 },
  expDetailEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  expDetailEditBtnText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  expDetailDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    backgroundColor: '#FFF0F0',
  },
  expDetailDeleteBtnText: { fontSize: 16, fontWeight: '700', color: Colors.danger },
});

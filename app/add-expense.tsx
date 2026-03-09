import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/context/auth-context';
import { Colors } from '@/constants/theme';
import { addExpense, updateExpense, subscribeToGroup, subscribeToGroupExpenses } from '@/lib/firestore';
import { formatAmount, CURRENCY_SYMBOLS } from '@/lib/types';
import type { Expense, Group } from '@/lib/types';

type SplitMode = 'equally' | 'exact' | 'percentage' | 'shares' | 'adjustment';

const MODE_TABS: { mode: SplitMode; icon: string }[] = [
  { mode: 'equally', icon: '=' },
  { mode: 'exact', icon: '1.23' },
  { mode: 'percentage', icon: '%' },
  { mode: 'shares', icon: '▊▊' },
  { mode: 'adjustment', icon: '+/−' },
];

const MODE_TITLES: Record<SplitMode, string> = {
  equally: 'Split equally',
  exact: 'Split by exact amounts',
  percentage: 'Split by percentages',
  shares: 'Split by shares',
  adjustment: 'Split by adjustment',
};

const MODE_DESCRIPTIONS: Record<SplitMode, string> = {
  equally: 'Select which people owe an equal share.',
  exact: 'Specify exactly how much each person owes.',
  percentage: 'Enter the percentage split for each person.',
  shares: 'Great for time-based splitting (2 nights → 2 shares).',
  adjustment: 'Enter adjustments; the rest is split equally.',
};

const MODE_LABELS: Record<SplitMode, string> = {
  equally: 'equally',
  exact: 'by exact amounts',
  percentage: 'by percentages',
  shares: 'by shares',
  adjustment: 'by adjustment',
};

export default function AddExpenseScreen() {
  const { groupId, expenseId } = useLocalSearchParams<{ groupId: string; expenseId?: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const isEditing = !!expenseId;

  const [group, setGroup] = useState<Group | null>(null);
  const [existingExpense, setExistingExpense] = useState<Expense | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  // Split state
  const [paidBy, setPaidBy] = useState('');
  const [splitMode, setSplitMode] = useState<SplitMode>('equally');
  const [equallySelected, setEquallySelected] = useState<string[]>([]);
  const [exactValues, setExactValues] = useState<Record<string, string>>({});
  const [percentValues, setPercentValues] = useState<Record<string, string>>({});
  const [shareValues, setShareValues] = useState<Record<string, string>>({});
  const [adjustValues, setAdjustValues] = useState<Record<string, string>>({});

  // UI state
  const [showSplitPanel, setShowSplitPanel] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load group
  useEffect(() => {
    if (!groupId) return;
    const unsub = subscribeToGroup(groupId, (g) => {
      setGroup(g);
      if (g && user && !isEditing) {
        setPaidBy(user.uid);
        setEquallySelected(g.members);
        const initExact: Record<string, string> = {};
        const initPct: Record<string, string> = {};
        const initShares: Record<string, string> = {};
        const initAdj: Record<string, string> = {};
        g.members.forEach((uid) => {
          initExact[uid] = '';
          initPct[uid] = '';
          initShares[uid] = '1';
          initAdj[uid] = '0';
        });
        setExactValues(initExact);
        setPercentValues(initPct);
        setShareValues(initShares);
        setAdjustValues(initAdj);
      }
    });
    return unsub;
  }, [groupId, user, isEditing]);

  // When editing: load the expense and pre-populate form once group is available
  useEffect(() => {
    if (!groupId || !expenseId) return;
    const unsub = subscribeToGroupExpenses(groupId, (exps) => {
      const exp = exps.find((e) => e.id === expenseId);
      if (!exp) return;
      setExistingExpense(exp);
    });
    return unsub;
  }, [groupId, expenseId]);

  // Pre-populate form from existing expense once both are loaded
  useEffect(() => {
    if (!existingExpense || !group) return;
    setDescription(existingExpense.description);
    setAmount(existingExpense.amount.toFixed(2));
    setPaidBy(existingExpense.paidBy);
    // Pre-populate as "exact" mode using split amounts
    setSplitMode('exact');
    setShowAdvanced(true);
    const initExact: Record<string, string> = {};
    const initPct: Record<string, string> = {};
    const initShares: Record<string, string> = {};
    const initAdj: Record<string, string> = {};
    const paidAmount = existingExpense.amount - Object.values(existingExpense.splits).reduce((s, v) => s + v, 0);
    group.members.forEach((uid) => {
      if (uid === existingExpense.paidBy) {
        initExact[uid] = paidAmount > 0 ? paidAmount.toFixed(2) : '0';
      } else {
        initExact[uid] = (existingExpense.splits[uid] ?? 0) > 0
          ? (existingExpense.splits[uid]).toFixed(2)
          : '';
      }
      initPct[uid] = '';
      initShares[uid] = '1';
      initAdj[uid] = '0';
    });
    setExactValues(initExact);
    setPercentValues(initPct);
    setShareValues(initShares);
    setAdjustValues(initAdj);
  }, [existingExpense, group]);

  const numAmount = parseFloat(amount) || 0;
  const symbol = group ? (CURRENCY_SYMBOLS[group.currency] ?? group.currency) : '';

  function computeSplits(): Record<string, number> | null {
    if (!group || numAmount <= 0) return null;
    const splits: Record<string, number> = {};

    if (splitMode === 'equally') {
      if (equallySelected.length === 0) return null;
      const share = numAmount / equallySelected.length;
      for (const uid of equallySelected) {
        if (uid !== paidBy) splits[uid] = parseFloat(share.toFixed(2));
      }
      return splits;
    }

    if (splitMode === 'exact') {
      let total = 0;
      for (const uid of group.members) {
        const val = parseFloat(exactValues[uid] || '0');
        if (isNaN(val) || val < 0) return null;
        total += val;
        if (uid !== paidBy && val > 0) splits[uid] = val;
      }
      if (Math.abs(total - numAmount) > 0.01) return null;
      return splits;
    }

    if (splitMode === 'percentage') {
      let totalPct = 0;
      for (const uid of group.members) {
        const pct = parseFloat(percentValues[uid] || '0');
        if (isNaN(pct) || pct < 0) return null;
        totalPct += pct;
        if (uid !== paidBy && pct > 0) {
          splits[uid] = parseFloat(((numAmount * pct) / 100).toFixed(2));
        }
      }
      if (Math.abs(totalPct - 100) > 0.01) return null;
      return splits;
    }

    if (splitMode === 'shares') {
      let totalShares = 0;
      for (const uid of group.members) {
        const sh = parseFloat(shareValues[uid] || '0');
        if (isNaN(sh) || sh < 0) return null;
        totalShares += sh;
      }
      if (totalShares <= 0) return null;
      for (const uid of group.members) {
        const sh = parseFloat(shareValues[uid] || '0');
        if (uid !== paidBy && sh > 0) {
          splits[uid] = parseFloat(((numAmount * sh) / totalShares).toFixed(2));
        }
      }
      return splits;
    }

    if (splitMode === 'adjustment') {
      const base = numAmount / group.members.length;
      let totalAdj = 0;
      for (const uid of group.members) {
        const adj = parseFloat(adjustValues[uid] || '0');
        if (isNaN(adj)) return null;
        totalAdj += adj;
      }
      if (Math.abs(totalAdj) > 0.01) return null;
      for (const uid of group.members) {
        if (uid !== paidBy) {
          const adj = parseFloat(adjustValues[uid] || '0');
          const final = base + adj;
          if (final > 0) splits[uid] = parseFloat(final.toFixed(2));
        }
      }
      return splits;
    }

    return null;
  }

  function getSplitFooter(): { text: string; valid: boolean } {
    if (!group || numAmount <= 0) return { text: '', valid: false };

    if (splitMode === 'equally') {
      const n = equallySelected.length;
      if (n === 0) return { text: 'Select at least 1 person', valid: false };
      return { text: `${symbol}${(numAmount / n).toFixed(2)}/person (${n} ${n === 1 ? 'person' : 'people'})`, valid: true };
    }

    if (splitMode === 'exact') {
      const entered = group.members.reduce((s, uid) => s + (parseFloat(exactValues[uid] || '0') || 0), 0);
      const remaining = numAmount - entered;
      const valid = Math.abs(remaining) < 0.01;
      return {
        text: `${symbol}${entered.toFixed(2)} of ${symbol}${numAmount.toFixed(2)}${valid ? '' : ` · ${symbol}${Math.abs(remaining).toFixed(2)} ${remaining > 0 ? 'left' : 'over'}`}`,
        valid,
      };
    }

    if (splitMode === 'percentage') {
      const totalPct = group.members.reduce((s, uid) => s + (parseFloat(percentValues[uid] || '0') || 0), 0);
      const remaining = 100 - totalPct;
      const valid = Math.abs(remaining) < 0.01;
      return {
        text: `${totalPct.toFixed(0)}% of 100%${valid ? '' : ` · ${Math.abs(remaining).toFixed(0)}% ${remaining > 0 ? 'left' : 'over'}`}`,
        valid,
      };
    }

    if (splitMode === 'shares') {
      const total = group.members.reduce((s, uid) => s + (parseFloat(shareValues[uid] || '0') || 0), 0);
      return { text: `${total} total share${total !== 1 ? 's' : ''}`, valid: total > 0 };
    }

    if (splitMode === 'adjustment') {
      const total = group.members.reduce((s, uid) => s + (parseFloat(adjustValues[uid] || '0') || 0), 0);
      const valid = Math.abs(total) < 0.01;
      return {
        text: `${total >= 0 ? '+' : ''}${symbol}${total.toFixed(2)} total adjustments${valid ? ' ✓' : ' (must be 0)'}`,
        valid,
      };
    }

    return { text: '', valid: false };
  }

  async function handleSave() {
    if (!group || !user) return;
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    const splits = computeSplits();
    if (splits === null) {
      Alert.alert('Error', 'Please complete the split options before saving');
      return;
    }
    setSaving(true);
    try {
      if (isEditing && expenseId) {
        await updateExpense(group.id, expenseId, description.trim(), numAmount, paidBy, splits);
      } else {
        await addExpense(group.id, description.trim(), numAmount, paidBy, splits, user.uid);
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : isEditing ? 'Failed to update expense' : 'Failed to add expense');
    } finally {
      setSaving(false);
    }
  }

  if (!group) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.light.textSecondary }}>Loading…</Text>
      </View>
    );
  }

  const paidByName = paidBy === user?.uid ? 'you' : (group.memberDetails[paidBy]?.displayName ?? paidBy);
  const isTwoPeople = group.members.length === 2;
  const otherMember = isTwoPeople ? group.members.find((uid) => uid !== user?.uid) : undefined;
  const otherName = otherMember ? (group.memberDetails[otherMember]?.displayName ?? otherMember) : '';

  // Quick options for 2-person groups
  type QuickOption = { label: string; detail: string; paidByUid: string; splitWith: string[] };
  const quickOptions: QuickOption[] = isTwoPeople && otherMember
    ? [
        {
          label: 'You paid, split equally',
          detail: `${otherName} owes you ${formatAmount(numAmount / 2, group.currency)}`,
          paidByUid: user!.uid,
          splitWith: [user!.uid, otherMember],
        },
        {
          label: 'You are owed the full amount',
          detail: `${otherName} owes you ${formatAmount(numAmount, group.currency)}`,
          paidByUid: user!.uid,
          splitWith: [otherMember],
        },
        {
          label: `${otherName} paid, split equally`,
          detail: `You owe ${otherName} ${formatAmount(numAmount / 2, group.currency)}`,
          paidByUid: otherMember,
          splitWith: [user!.uid, otherMember],
        },
        {
          label: `${otherName} is owed the full amount`,
          detail: `You owe ${otherName} ${formatAmount(numAmount, group.currency)}`,
          paidByUid: otherMember,
          splitWith: [user!.uid],
        },
      ]
    : [];

  function selectQuickOption(opt: QuickOption) {
    setPaidBy(opt.paidByUid);
    setSplitMode('equally');
    setEquallySelected(opt.splitWith);
  }

  function isQuickSelected(opt: QuickOption) {
    return (
      splitMode === 'equally' &&
      paidBy === opt.paidByUid &&
      equallySelected.length === opt.splitWith.length &&
      opt.splitWith.every((uid) => equallySelected.includes(uid))
    );
  }

  function openSplitPanel() {
    setShowAdvanced(!isTwoPeople);
    setShowSplitPanel(true);
  }

  const footer = getSplitFooter();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.light.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.groupTag}>
          <Ionicons name={isEditing ? 'create-outline' : 'albums-outline'} size={14} color={Colors.primary} />
          <Text style={styles.groupTagText}>{isEditing ? `Edit · ${group.name}` : group.name}</Text>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="What was this expense for?"
          placeholderTextColor={Colors.light.textSecondary}
          autoFocus
          maxLength={80}
        />

        <Text style={styles.label}>Amount ({group.currency})</Text>
        <View style={styles.amountRow}>
          <Text style={styles.currencySymbol}>{symbol}</Text>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={Colors.light.textSecondary}
            keyboardType="decimal-pad"
          />
        </View>

        <Pressable style={styles.splitBar} onPress={openSplitPanel}>
          <Text style={styles.splitBarText}>
            {'Paid by '}
            <Text style={styles.splitBarHighlight}>{paidByName}</Text>
            {' and split '}
            <Text style={styles.splitBarHighlight}>{MODE_LABELS[splitMode]}</Text>
          </Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </Pressable>

        {numAmount > 0 && footer.text ? (
          <View style={[styles.footerPill, footer.valid ? styles.footerPillValid : styles.footerPillInvalid]}>
            <Text style={[styles.footerPillText, { color: footer.valid ? Colors.primary : Colors.danger }]}>
              {footer.text}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Expense'}
          </Text>
        </Pressable>
      </ScrollView>

      {/* ── Split Options Overlay ── */}
      {showSplitPanel && (
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.overlayHeader}>
            <Pressable onPress={() => setShowSplitPanel(false)} hitSlop={12}>
              <Text style={styles.overlayCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.overlayTitle}>Split options</Text>
            <Pressable
              onPress={() => setShowSplitPanel(false)}
              disabled={numAmount > 0 && !footer.valid && showAdvanced}
              hitSlop={12}
            >
              <Text style={[styles.overlayDone, numAmount > 0 && !footer.valid && showAdvanced && { opacity: 0.4 }]}>
                Done
              </Text>
            </Pressable>
          </View>

          {/* Paid by row */}
          <View style={styles.paidBySection}>
            <Text style={styles.paidByLabel}>Paid by</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.payerRow}>
              {group.members.map((uid) => {
                const name = uid === user?.uid ? 'You' : (group.memberDetails[uid]?.displayName ?? uid);
                const selected = paidBy === uid;
                return (
                  <Pressable
                    key={uid}
                    style={[styles.payerChip, selected && styles.payerChipSelected]}
                    onPress={() => setPaidBy(uid)}
                  >
                    <Text style={[styles.payerChipText, selected && styles.payerChipTextSelected]}>
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
            {/* Quick options for 2-person groups */}
            {isTwoPeople && !showAdvanced ? (
              <View style={styles.quickSection}>
                <Text style={styles.quickTitle}>How was this expense split?</Text>
                {quickOptions.map((opt, i) => (
                  <Pressable
                    key={i}
                    style={[styles.quickOption, isQuickSelected(opt) && styles.quickOptionSelected]}
                    onPress={() => selectQuickOption(opt)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.quickLabel, isQuickSelected(opt) && { color: Colors.primary }]}>
                        {opt.label}
                      </Text>
                      {numAmount > 0 && (
                        <Text style={[styles.quickDetail, { color: opt.paidByUid === user?.uid ? Colors.primary : Colors.danger }]}>
                          {opt.detail}
                        </Text>
                      )}
                    </View>
                    {isQuickSelected(opt) && (
                      <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                    )}
                  </Pressable>
                ))}
                <Pressable style={styles.moreOptionsBtn} onPress={() => setShowAdvanced(true)}>
                  <Text style={styles.moreOptionsBtnText}>More options</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.advancedSection}>
                {isTwoPeople && (
                  <Pressable style={styles.backToSimpleBtn} onPress={() => setShowAdvanced(false)}>
                    <Ionicons name="chevron-back" size={14} color={Colors.primary} />
                    <Text style={styles.backToSimpleBtnText}>Simple options</Text>
                  </Pressable>
                )}

                {/* Mode tab bar */}
                <View style={styles.modeTabs}>
                  {MODE_TABS.map(({ mode, icon }) => (
                    <Pressable
                      key={mode}
                      style={[styles.modeTab, splitMode === mode && styles.modeTabActive]}
                      onPress={() => setSplitMode(mode)}
                    >
                      <Text style={[styles.modeTabIcon, splitMode === mode && styles.modeTabIconActive]}>
                        {icon}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.modeTitle}>{MODE_TITLES[splitMode]}</Text>
                <Text style={styles.modeDesc}>{MODE_DESCRIPTIONS[splitMode]}</Text>

                {/* Member rows */}
                <View style={styles.memberRows}>
                  {group.members.map((uid) => {
                    const name = uid === user?.uid ? 'You' : (group.memberDetails[uid]?.displayName ?? uid);

                    if (splitMode === 'equally') {
                      const checked = equallySelected.includes(uid);
                      const share = equallySelected.length > 0 ? numAmount / equallySelected.length : 0;
                      return (
                        <Pressable
                          key={uid}
                          style={styles.memberRow}
                          onPress={() =>
                            setEquallySelected((prev) =>
                              prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]
                            )
                          }
                        >
                          <View style={[styles.checkCircle, checked && styles.checkCircleActive]}>
                            {checked && <Ionicons name="checkmark" size={14} color="#FFF" />}
                          </View>
                          <Text style={styles.memberName}>{name}</Text>
                          {checked && numAmount > 0 && (
                            <Text style={styles.memberAmount}>{symbol}{share.toFixed(2)}</Text>
                          )}
                        </Pressable>
                      );
                    }

                    if (splitMode === 'exact') {
                      return (
                        <View key={uid} style={styles.memberRow}>
                          <View style={styles.memberAvatar}>
                            <Text style={styles.memberAvatarText}>{name[0].toUpperCase()}</Text>
                          </View>
                          <Text style={styles.memberName}>{name}</Text>
                          <View style={styles.inputRow}>
                            <Text style={styles.inputPrefix}>{symbol}</Text>
                            <TextInput
                              style={styles.inlineInput}
                              value={exactValues[uid]}
                              onChangeText={(v) => setExactValues((prev) => ({ ...prev, [uid]: v }))}
                              placeholder="0.00"
                              placeholderTextColor={Colors.light.textSecondary}
                              keyboardType="decimal-pad"
                            />
                          </View>
                        </View>
                      );
                    }

                    if (splitMode === 'percentage') {
                      return (
                        <View key={uid} style={styles.memberRow}>
                          <View style={styles.memberAvatar}>
                            <Text style={styles.memberAvatarText}>{name[0].toUpperCase()}</Text>
                          </View>
                          <Text style={styles.memberName}>{name}</Text>
                          <View style={styles.inputRow}>
                            <TextInput
                              style={styles.inlineInput}
                              value={percentValues[uid]}
                              onChangeText={(v) => setPercentValues((prev) => ({ ...prev, [uid]: v }))}
                              placeholder="0"
                              placeholderTextColor={Colors.light.textSecondary}
                              keyboardType="decimal-pad"
                            />
                            <Text style={styles.inputSuffix}>%</Text>
                          </View>
                        </View>
                      );
                    }

                    if (splitMode === 'shares') {
                      const sh = parseFloat(shareValues[uid] || '0');
                      const totalSh = group.members.reduce(
                        (s, u) => s + (parseFloat(shareValues[u] || '0') || 0),
                        0
                      );
                      const shareAmt = totalSh > 0 ? (numAmount * sh) / totalSh : 0;
                      return (
                        <View key={uid} style={styles.memberRow}>
                          <View style={styles.memberAvatar}>
                            <Text style={styles.memberAvatarText}>{name[0].toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.memberName}>{name}</Text>
                            {numAmount > 0 && totalSh > 0 && (
                              <Text style={styles.memberSubtext}>{symbol}{shareAmt.toFixed(2)}</Text>
                            )}
                          </View>
                          <View style={styles.inputRow}>
                            <TextInput
                              style={styles.inlineInput}
                              value={shareValues[uid]}
                              onChangeText={(v) => setShareValues((prev) => ({ ...prev, [uid]: v }))}
                              placeholder="1"
                              placeholderTextColor={Colors.light.textSecondary}
                              keyboardType="decimal-pad"
                            />
                            <Text style={styles.inputSuffix}>share(s)</Text>
                          </View>
                        </View>
                      );
                    }

                    if (splitMode === 'adjustment') {
                      const base = group.members.length > 0 ? numAmount / group.members.length : 0;
                      const adj = parseFloat(adjustValues[uid] || '0') || 0;
                      const final = base + adj;
                      return (
                        <View key={uid} style={styles.memberRow}>
                          <View style={styles.memberAvatar}>
                            <Text style={styles.memberAvatarText}>{name[0].toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.memberName}>{name}</Text>
                            {numAmount > 0 && (
                              <Text style={styles.memberSubtext}>{symbol}{final.toFixed(2)}</Text>
                            )}
                          </View>
                          <View style={styles.inputRow}>
                            <Text style={styles.inputPrefix}>+</Text>
                            <TextInput
                              style={styles.inlineInput}
                              value={adjustValues[uid] === '0' ? '' : adjustValues[uid]}
                              onChangeText={(v) => setAdjustValues((prev) => ({ ...prev, [uid]: v || '0' }))}
                              placeholder="0.00"
                              placeholderTextColor={Colors.light.textSecondary}
                              keyboardType="numbers-and-punctuation"
                            />
                          </View>
                        </View>
                      );
                    }

                    return null;
                  })}
                </View>

                {/* Equally: select all button */}
                {splitMode === 'equally' && (
                  <Pressable
                    style={styles.selectAllBtn}
                    onPress={() => setEquallySelected(group.members)}
                  >
                    <Text style={styles.selectAllBtnText}>Select All</Text>
                  </Pressable>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          {numAmount > 0 && footer.text ? (
            <View style={[styles.overlayFooter, footer.valid ? styles.overlayFooterValid : styles.overlayFooterInvalid]}>
              <Text style={[styles.overlayFooterText, { color: footer.valid ? Colors.primary : Colors.danger }]}>
                {footer.text}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 40 },
  groupTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  groupTagText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  label: { fontSize: 14, fontWeight: '600', color: Colors.light.text, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: Colors.light.card,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.light.text,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currencySymbol: { fontSize: 20, color: Colors.light.textSecondary, fontWeight: '600', width: 24, textAlign: 'center' },
  splitBar: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
  },
  splitBarText: { fontSize: 15, color: Colors.light.text, fontWeight: '500' },
  splitBarHighlight: { color: Colors.primary, fontWeight: '700' },
  footerPill: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'center',
  },
  footerPillValid: { backgroundColor: Colors.primaryLight },
  footerPillInvalid: { backgroundColor: '#FFF0F0' },
  footerPillText: { fontSize: 13, fontWeight: '600' },
  button: {
    marginTop: 28,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: '700' },

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
  overlayCancel: { fontSize: 15, color: Colors.danger, fontWeight: '600' },
  overlayDone: { fontSize: 15, color: Colors.primary, fontWeight: '700' },

  // Payer section
  paidBySection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  paidByLabel: { fontSize: 12, color: Colors.light.textSecondary, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  payerRow: {},
  payerChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.background,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    marginRight: 8,
  },
  payerChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  payerChipText: { fontSize: 14, fontWeight: '600', color: Colors.light.textSecondary },
  payerChipTextSelected: { color: Colors.primary },

  // Quick options
  quickSection: { padding: 16 },
  quickTitle: { fontSize: 14, fontWeight: '600', color: Colors.light.textSecondary, marginBottom: 12, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
  quickOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  quickOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  quickLabel: { fontSize: 15, fontWeight: '600', color: Colors.light.text },
  quickDetail: { fontSize: 13, fontWeight: '600', marginTop: 3 },
  moreOptionsBtn: {
    marginTop: 6,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  moreOptionsBtnText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },

  // Advanced section
  advancedSection: { padding: 16 },
  backToSimpleBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backToSimpleBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '600', marginLeft: 2 },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 16,
  },
  modeTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  modeTabActive: { backgroundColor: Colors.primary },
  modeTabIcon: { fontSize: 13, color: Colors.light.textSecondary, fontWeight: '700' },
  modeTabIconActive: { color: '#FFF' },
  modeTitle: { fontSize: 17, fontWeight: '700', color: Colors.light.text, textAlign: 'center', marginBottom: 4 },
  modeDesc: { fontSize: 13, color: Colors.light.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 18 },

  // Member rows
  memberRows: {
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 12,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  memberName: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.light.text },
  memberSubtext: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 1 },
  memberAmount: { fontSize: 14, color: Colors.light.textSecondary, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inputPrefix: { fontSize: 14, color: Colors.light.textSecondary, fontWeight: '600', minWidth: 14 },
  inputSuffix: { fontSize: 13, color: Colors.light.textSecondary, fontWeight: '600' },
  inlineInput: {
    minWidth: 64,
    maxWidth: 90,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'right',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  selectAllBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary + '60',
  },
  selectAllBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  // Overlay footer
  overlayFooter: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    alignItems: 'center',
  },
  overlayFooterValid: { backgroundColor: Colors.primaryLight },
  overlayFooterInvalid: { backgroundColor: '#FFF0F0' },
  overlayFooterText: { fontSize: 14, fontWeight: '700' },
});

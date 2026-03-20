import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { createGroup } from '@/lib/firestore';
import { CURRENCIES, GROUP_CATEGORIES, type GroupCategory } from '@/lib/types';

export default function CreateGroupScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GroupCategory>('other');
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!user || !profile) return;
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    setLoading(true);
    try {
      const groupId = await createGroup(name.trim(), category, currency, user.uid, {
        displayName: profile.displayName,
        email: profile.email,
      });
      router.replace(`/group/${groupId}`);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.light.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Group Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Goa Trip, Flat Expenses…"
          placeholderTextColor={Colors.light.textSecondary}
          autoFocus
          maxLength={60}
        />

        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.categoryGrid}>
          {GROUP_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.value}
              style={[styles.categoryCard, category === cat.value && styles.categoryCardSelected]}
              onPress={() => setCategory(cat.value)}
            >
              <Ionicons
                name={cat.icon as React.ComponentProps<typeof Ionicons>['name']}
                size={24}
                color={category === cat.value ? Colors.primary : Colors.light.textSecondary}
              />
              <Text style={[styles.categoryLabel, category === cat.value && { color: Colors.primary }]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Currency</Text>
        <View style={styles.currencyGrid}>
          {CURRENCIES.map((c) => (
            <Pressable
              key={c.code}
              style={[styles.currencyChip, currency === c.code && styles.currencyChipSelected]}
              onPress={() => setCurrency(c.code)}
            >
              <Text style={[styles.currencyCode, currency === c.code && { color: Colors.primary }]}>
                {c.symbol} {c.code}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Creating…' : 'Create Group'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 10,
    marginTop: 20,
  },
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
  categoryGrid: { flexDirection: 'row', gap: 10 },
  categoryCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  categoryCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  categoryLabel: { fontSize: 12, fontWeight: '600', color: Colors.light.textSecondary },
  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  currencyChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  currencyChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  currencyCode: { fontSize: 14, fontWeight: '600', color: Colors.light.textSecondary },
  button: {
    marginTop: 32,
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
});

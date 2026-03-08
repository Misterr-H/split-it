import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { Colors } from '@/constants/theme';

export default function AccountScreen() {
  const { user, profile, logOut } = useAuth();
  const router = useRouter();

  const initials = profile?.displayName
    ? profile.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  async function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.displayName ?? 'User'}</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <MenuItem icon="person-outline" label="Display Name" value={profile?.displayName} />
          <View style={styles.divider} />
          <MenuItem icon="mail-outline" label="Email" value={user?.email ?? ''} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More</Text>
        <View style={styles.card}>
          <Pressable style={styles.menuItem} onPress={handleLogout}>
            <View style={[styles.menuIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
            </View>
            <Text style={[styles.menuLabel, { color: Colors.danger }]}>Log Out</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.light.border} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string | null;
}) {
  return (
    <View style={styles.menuItem}>
      <View style={[styles.menuIcon, { backgroundColor: Colors.primaryLight }]}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuValue} numberOfLines={1}>{value ?? '—'}</Text>
    </View>
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
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: { color: '#FFF', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', color: Colors.light.text, marginBottom: 4 },
  email: { fontSize: 14, color: Colors.light.textSecondary },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  divider: { height: 1, backgroundColor: Colors.light.border, marginLeft: 58 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.light.text },
  menuValue: { fontSize: 14, color: Colors.light.textSecondary, maxWidth: 140 },
});

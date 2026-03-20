import { Link, useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/context/auth-context';
import { Colors } from '@/constants/theme';
import { auth } from '@/lib/firebase';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function handleForgotPassword() {
    if (!forgotEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim().toLowerCase());
      setForgotSent(true);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace('/(app)/groups');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <Text style={styles.title}>Split-It</Text>
            <Text style={styles.subtitle}>Split expenses with friends, effortlessly</Text>
          </View>

          <View style={styles.form}>
            {showForgot ? (
              <>
                <Text style={styles.forgotTitle}>Reset Password</Text>
                <Text style={styles.forgotDesc}>Enter your email and we'll send you a reset link.</Text>

                {forgotSent ? (
                  <View style={styles.forgotSuccessBox}>
                    <Text style={styles.forgotSent}>Reset email sent! Check your inbox.</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      placeholder="you@example.com"
                      placeholderTextColor={Colors.light.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                    />
                    <Pressable
                      style={[styles.button, forgotLoading && styles.buttonDisabled]}
                      onPress={handleForgotPassword}
                      disabled={forgotLoading}
                    >
                      <Text style={styles.buttonText}>
                        {forgotLoading ? 'Sending…' : 'Send Reset Email'}
                      </Text>
                    </Pressable>
                  </>
                )}

                <Pressable
                  style={styles.backRow}
                  onPress={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); }}
                >
                  <Text style={styles.link}>← Back to Sign In</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.light.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.light.textSecondary}
                  secureTextEntry
                />

                <Pressable
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
                </Pressable>

                <Pressable
                  style={styles.forgotRow}
                  onPress={() => setShowForgot(true)}
                >
                  <Text style={styles.link}>Forgot password?</Text>
                </Pressable>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>Don't have an account? </Text>
                  <Link href="/(auth)/signup" asChild>
                    <Pressable>
                      <Text style={styles.link}>Sign Up</Text>
                    </Pressable>
                  </Link>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.light.background },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 48 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: { color: '#FFF', fontSize: 32, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: Colors.light.textSecondary, textAlign: 'center' },
  form: { gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.light.text, marginBottom: 6, marginTop: 12 },
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
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  forgotTitle: { fontSize: 22, fontWeight: '700', color: Colors.light.text, marginBottom: 6 },
  forgotDesc: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 16 },
  forgotSuccessBox: { paddingVertical: 24, alignItems: 'center' },
  forgotSent: { color: Colors.primary, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  forgotRow: { alignItems: 'flex-end', marginTop: 8 },
  backRow: { alignItems: 'center', marginTop: 20 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: Colors.light.textSecondary, fontSize: 15 },
  link: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
});

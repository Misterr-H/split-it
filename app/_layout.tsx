import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { Colors } from '@/constants/theme';

// Handles redirect side-effects only — always returns null so the Stack is unaffected.
function AuthGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  console.log('[AuthGuard] render — loading:', loading, '| user:', user?.uid ?? 'null', '| segments:', segments);

  useEffect(() => {
    console.log('[AuthGuard] effect — loading:', loading, '| user:', user?.uid ?? 'null', '| segments:', segments);
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';
    const inGroupDetail = segments[0] === 'group';
    const inModal = segments[0] === 'create-group' || segments[0] === 'add-expense';
    const isSettled = inAppGroup || inGroupDetail || inModal;

    if (!user && !inAuthGroup) {
      // Unauthenticated and not on an auth screen (covers index + app screens)
      console.log('[AuthGuard] → redirecting to /(auth)/login');
      router.replace('/(auth)/login');
    } else if (user && !isSettled) {
      // Logged in but on index or auth screen → go to app
      console.log('[AuthGuard] → redirecting to /(app)/groups');
      router.replace('/(app)/groups');
    } else {
      console.log('[AuthGuard] → no redirect needed');
    }
  }, [user, loading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen
          name="create-group"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Create Group',
            headerStyle: { backgroundColor: Colors.light.card },
            headerTintColor: Colors.primary,
          }}
        />
        <Stack.Screen
          name="add-expense"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Add Expense',
            headerStyle: { backgroundColor: Colors.light.card },
            headerTintColor: Colors.primary,
          }}
        />
        <Stack.Screen
          name="group/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: Colors.primary },
            headerTintColor: '#FFFFFF',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
      <AuthGuard />
    </AuthProvider>
  );
}

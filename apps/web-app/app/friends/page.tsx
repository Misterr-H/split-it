'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Navbar } from '@/components/navbar';
import { subscribeToUserGroups, subscribeToGroupExpenses } from '@/lib/firestore';
import {
  calculateFriendBalances,
  formatAmount,
  type Group,
  type Expense,
  type FriendBalance,
} from '@/lib/types';

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [friends, setFriends] = useState<FriendBalance[]>([]);
  const [currentGroups, setCurrentGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    const expenseUnsubs: (() => void)[] = [];
    const expensesMap: Record<string, Expense[]> = {};
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

      for (const group of fetchedGroups) {
        expensesMap[group.id] = [];
        const unsub = subscribeToGroupExpenses(group.id, (exps) => {
          expensesMap[group.id] = exps;
          const fb = calculateFriendBalances(currentGroups, expensesMap, user.uid);
          fb.sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount));
          setFriends(fb);
          setLoading(false);
        });
        expenseUnsubs.push(unsub);
      }
    });

    return () => {
      unsubGroups();
      expenseUnsubs.forEach((u) => u());
    };
  }, [user, authLoading, router]);

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-[#1B998B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Friends</h1>
        <p className="text-sm text-gray-400 mb-5">Your net balances across all groups</p>

        {friends.length > 0 && (owedEntries.length > 0 || oweEntries.length > 0) && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">You are owed</p>
              {owedEntries.length > 0
                ? owedEntries.map(([cur, amt]) => (
                    <p key={cur} className="text-xl font-bold text-[#1B998B]">{formatAmount(amt, cur)}</p>
                  ))
                : <p className="text-2xl font-bold text-gray-300">—</p>
              }
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">You owe</p>
              {oweEntries.length > 0
                ? oweEntries.map(([cur, amt]) => (
                    <p key={cur} className="text-xl font-bold text-[#E84545]">{formatAmount(Math.abs(amt), cur)}</p>
                  ))
                : <p className="text-2xl font-bold text-gray-300">—</p>
              }
            </div>
          </div>
        )}

        {friends.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No balances yet</h2>
            <p className="text-gray-500 text-sm mb-6">Add expenses in your groups to see friend balances here</p>
            <Link
              href="/groups"
              className="bg-[#1B998B] text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-[#158a7d] transition"
            >
              Go to Groups
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <div key={friend.uid} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-base font-bold text-gray-600 shrink-0">
                    {friend.displayName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{friend.displayName}</p>
                    <p className="text-xs text-gray-400 truncate">{friend.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {Object.entries(
                      friend.groups.reduce<Record<string, number>>((acc, g) => {
                        const cur = groupCurrencyMap[g.groupId];
                        if (cur) acc[cur] = (acc[cur] ?? 0) + g.amount;
                        return acc;
                      }, {})
                    ).map(([cur, amt]) => (
                      <div key={cur} className="mb-0.5">
                        <p className="text-xs text-gray-400">{amt > 0 ? 'owes you' : 'you owe'}</p>
                        <p className={`font-bold ${amt > 0 ? 'text-[#1B998B]' : 'text-[#E84545]'}`}>
                          {formatAmount(Math.abs(amt), cur)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {friend.groups.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
                    {friend.groups.map((g) => (
                      <div key={g.groupId} className="flex items-center justify-between">
                        <Link
                          href={`/groups/${g.groupId}`}
                          className="text-xs text-[#1B998B] hover:underline font-medium"
                        >
                          {g.groupName}
                        </Link>
                        <span className={`text-xs font-semibold ${g.amount > 0 ? 'text-[#1B998B]' : 'text-[#E84545]'}`}>
                          {formatAmount(Math.abs(g.amount), groupCurrencyMap[g.groupId] ?? '')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

import type { Balance, Expense, FriendBalance, Group, Settlement } from './types';

export function calculateGroupBalances(
  expenses: Expense[],
  currentUserId: string,
  memberDetails: Group['memberDetails'],
  settlements?: Settlement[]
): Balance[] {
  const balanceMap: Record<string, number> = {};

  for (const expense of expenses) {
    if (expense.paidBy === currentUserId) {
      for (const [uid, amount] of Object.entries(expense.splits)) {
        balanceMap[uid] = (balanceMap[uid] ?? 0) + amount;
      }
    } else if (expense.splits[currentUserId] !== undefined) {
      const amount = expense.splits[currentUserId];
      balanceMap[expense.paidBy] = (balanceMap[expense.paidBy] ?? 0) - amount;
    }
  }

  // Settlements: {from: X, to: Y, amount: A} means X paid A to Y
  // From X's view: X owes Y less → balanceMap[Y] += A
  // From Y's view: Y is owed less by X → balanceMap[X] -= A
  for (const s of settlements ?? []) {
    if (s.from === currentUserId) {
      balanceMap[s.to] = (balanceMap[s.to] ?? 0) + s.amount;
    } else if (s.to === currentUserId) {
      balanceMap[s.from] = (balanceMap[s.from] ?? 0) - s.amount;
    }
  }

  return Object.entries(balanceMap)
    .filter(([, amount]) => Math.abs(amount) > 0.001)
    .map(([uid, amount]) => ({
      uid,
      displayName: memberDetails[uid]?.displayName ?? uid,
      amount,
    }));
}

export function calculateFriendBalances(
  groups: Group[],
  expensesByGroup: Record<string, Expense[]>,
  currentUserId: string,
  settlementsByGroup?: Record<string, Settlement[]>
): FriendBalance[] {
  const friendMap: Record<string, FriendBalance> = {};

  for (const group of groups) {
    const expenses = expensesByGroup[group.id] ?? [];
    const settlements = settlementsByGroup?.[group.id];
    const balances = calculateGroupBalances(expenses, currentUserId, group.memberDetails, settlements);

    for (const balance of balances) {
      if (!friendMap[balance.uid]) {
        const detail = group.memberDetails[balance.uid];
        friendMap[balance.uid] = {
          uid: balance.uid,
          displayName: detail?.displayName ?? balance.uid,
          email: detail?.email ?? '',
          netAmount: 0,
          groups: [],
        };
      }
      friendMap[balance.uid].netAmount += balance.amount;
      if (Math.abs(balance.amount) > 0.001) {
        friendMap[balance.uid].groups.push({
          groupId: group.id,
          groupName: group.name,
          amount: balance.amount,
        });
      }
    }
  }

  return Object.values(friendMap).filter((f) => Math.abs(f.netAmount) > 0.001);
}

export function getGroupNetBalance(
  expenses: Expense[],
  currentUserId: string
): number {
  let net = 0;
  for (const expense of expenses) {
    if (expense.paidBy === currentUserId) {
      for (const amount of Object.values(expense.splits)) {
        net += amount;
      }
    } else if (expense.splits[currentUserId] !== undefined) {
      net -= expense.splits[currentUserId];
    }
  }
  return net;
}

export interface MemberNetBalance {
  uid: string;
  displayName: string;
  totalPaid: number;
  totalOwed: number;
  net: number;
}

/**
 * Computes aggregate totals for every member in the group — used by Balances and Totals views.
 * totalPaid  = sum of all expense amounts where this member was the payer
 * totalOwed  = sum of all split amounts attributed to this member (what they consumed)
 * net        = totalPaid - totalOwed (positive = gets money back, negative = owes money)
 */
export function calculateMemberNetBalances(
  expenses: Expense[],
  settlements: Settlement[],
  memberDetails: Group['memberDetails']
): MemberNetBalance[] {
  const paid: Record<string, number> = {};
  const owed: Record<string, number> = {};

  for (const expense of expenses) {
    paid[expense.paidBy] = (paid[expense.paidBy] ?? 0) + expense.amount;
    for (const [uid, share] of Object.entries(expense.splits)) {
      owed[uid] = (owed[uid] ?? 0) + share;
    }
    // Payer's own implicit share = amount - sum(splits)
    const splitTotal = Object.values(expense.splits).reduce((s, v) => s + v, 0);
    const payerOwnShare = expense.amount - splitTotal;
    if (payerOwnShare > 0.001) {
      owed[expense.paidBy] = (owed[expense.paidBy] ?? 0) + payerOwnShare;
    }
  }

  // Settlements shift the net: X paying Y → X's net improves, Y's worsens
  const settlementAdj: Record<string, number> = {};
  for (const s of settlements) {
    settlementAdj[s.from] = (settlementAdj[s.from] ?? 0) + s.amount;
    settlementAdj[s.to] = (settlementAdj[s.to] ?? 0) - s.amount;
  }

  const uids = Object.keys(memberDetails);
  return uids.map((uid) => {
    const p = paid[uid] ?? 0;
    const o = owed[uid] ?? 0;
    const adj = settlementAdj[uid] ?? 0;
    return {
      uid,
      displayName: memberDetails[uid]?.displayName ?? uid,
      totalPaid: p,
      totalOwed: o,
      net: p - o + adj,
    };
  });
}

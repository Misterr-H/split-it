'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Currency = '₹' | '$' | '€' | '£' | '¥';

interface Participant {
  id: string;
  name: string;
}

interface ExpenseSplit {
  participantId: string;
  amount: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidById: string;
  splitBetween: string[]; // participant ids
  splitType: 'equal' | 'custom';
  customSplits?: ExpenseSplit[];
}

interface Session {
  eventName: string;
  participants: Participant[];
  expenses: Expense[];
  currency: Currency;
}

interface Balance {
  participantId: string;
  name: string;
  totalPaid: number;
  fairShare: number;
  net: number;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function computeBalances(participants: Participant[], expenses: Expense[]): Balance[] {
  const paid: Record<string, number> = {};
  const share: Record<string, number> = {};
  participants.forEach((p) => { paid[p.id] = 0; share[p.id] = 0; });

  for (const exp of expenses) {
    paid[exp.paidById] = (paid[exp.paidById] || 0) + exp.amount;
    if (exp.splitType === 'equal') {
      const each = exp.amount / exp.splitBetween.length;
      exp.splitBetween.forEach((id) => { share[id] = (share[id] || 0) + each; });
    } else if (exp.customSplits) {
      exp.customSplits.forEach((s) => { share[s.participantId] = (share[s.participantId] || 0) + s.amount; });
    }
  }

  return participants.map((p) => ({
    participantId: p.id,
    name: p.name,
    totalPaid: paid[p.id] || 0,
    fairShare: share[p.id] || 0,
    net: (paid[p.id] || 0) - (share[p.id] || 0),
  }));
}

function computeSettlements(balances: Balance[]): Settlement[] {
  const creditors = balances.filter((b) => b.net > 0.005).map((b) => ({ name: b.name, amount: b.net }));
  const debtors = balances.filter((b) => b.net < -0.005).map((b) => ({ name: b.name, amount: -b.net }));
  const settlements: Settlement[] = [];

  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const pay = Math.min(creditors[i].amount, debtors[j].amount);
    if (pay > 0.005) {
      settlements.push({ from: debtors[j].name, to: creditors[i].name, amount: pay });
    }
    creditors[i].amount -= pay;
    debtors[j].amount -= pay;
    if (creditors[i].amount < 0.005) i++;
    if (debtors[j].amount < 0.005) j++;
  }
  return settlements;
}

function encodeState(session: Session): string {
  try {
    const json = JSON.stringify(session);
    return btoa(encodeURIComponent(json));
  } catch {
    return '';
  }
}

function decodeState(hash: string): Session | null {
  try {
    const json = decodeURIComponent(atob(hash));
    return JSON.parse(json) as Session;
  } catch {
    return null;
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl animate-fade-in">
      {message}
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = ['Group Setup', 'Add Expenses', 'Results'];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, idx) => {
        const num = idx + 1;
        const active = current === num;
        const done = current > num;
        return (
          <div key={num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  done ? 'bg-[#1B998B] text-white' : active ? 'bg-[#1B998B] text-white ring-4 ring-[#1B998B]/20' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {done ? '✓' : num}
              </div>
              <span className={`text-xs mt-1 font-medium ${active ? 'text-[#1B998B]' : done ? 'text-gray-500' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-16 sm:w-24 h-0.5 mb-4 mx-1 transition-all ${done ? 'bg-[#1B998B]' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Group Setup ──────────────────────────────────────────────────────

function Step1({
  session,
  onUpdate,
  onNext,
}: {
  session: Session;
  onUpdate: (s: Partial<Session>) => void;
  onNext: () => void;
}) {
  const [nameInput, setNameInput] = useState('');
  const [errors, setErrors] = useState<{ event?: string; participants?: string }>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const addPerson = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    if (session.participants.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setNameInput('');
      return;
    }
    onUpdate({ participants: [...session.participants, { id: genId(), name: trimmed }] });
    setNameInput('');
    inputRef.current?.focus();
  };

  const removePerson = (id: string) => {
    onUpdate({ participants: session.participants.filter((p) => p.id !== id) });
  };

  const handleNext = () => {
    const errs: typeof errors = {};
    if (!session.eventName.trim()) errs.event = 'Please enter a group or event name.';
    if (session.participants.length < 2) errs.participants = 'Add at least 2 participants.';
    setErrors(errs);
    if (Object.keys(errs).length === 0) onNext();
  };

  return (
    <div className="space-y-6">
      {/* Event name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Group / Event name
        </label>
        <input
          type="text"
          value={session.eventName}
          onChange={(e) => onUpdate({ eventName: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && handleNext()}
          placeholder="e.g. Goa Trip, Office Lunch"
          className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition focus:border-[#1B998B] focus:ring-2 focus:ring-[#1B998B]/20 ${errors.event ? 'border-[#E84545]' : 'border-gray-200'}`}
        />
        {errors.event && <p className="text-[#E84545] text-xs mt-1">{errors.event}</p>}
      </div>

      {/* Currency */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Currency</label>
        <div className="flex gap-2 flex-wrap">
          {(['₹', '$', '€', '£', '¥'] as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onUpdate({ currency: c })}
              className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                session.currency === c
                  ? 'bg-[#1B998B] border-[#1B998B] text-white'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Participants */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Participants</label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPerson()}
            placeholder="Enter a name"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition focus:border-[#1B998B] focus:ring-2 focus:ring-[#1B998B]/20"
          />
          <button
            type="button"
            onClick={addPerson}
            className="px-4 py-3 bg-[#1B998B] text-white rounded-xl font-semibold text-sm hover:bg-[#158a7d] transition shrink-0"
          >
            Add
          </button>
        </div>
        {errors.participants && <p className="text-[#E84545] text-xs mt-1">{errors.participants}</p>}

        {session.participants.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {session.participants.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 bg-[#E8F8F6] text-[#1B998B] text-sm font-medium px-3 py-1.5 rounded-full"
              >
                {p.name}
                <button
                  type="button"
                  onClick={() => removePerson(p.id)}
                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-[#1B998B] hover:text-white transition text-[#1B998B] font-bold leading-none"
                  aria-label={`Remove ${p.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleNext}
        className="w-full py-3.5 bg-[#1B998B] text-white font-bold rounded-xl hover:bg-[#158a7d] transition text-sm"
      >
        Start Splitting →
      </button>
    </div>
  );
}

// ─── Expense Form ─────────────────────────────────────────────────────────────

interface ExpenseFormProps {
  participants: Participant[];
  currency: Currency;
  initialExpense?: Expense;
  onSave: (expense: Expense) => void;
  onCancel?: () => void;
}

function ExpenseForm({ participants, currency, initialExpense, onSave, onCancel }: ExpenseFormProps) {
  const [desc, setDesc] = useState(initialExpense?.description ?? '');
  const [amount, setAmount] = useState(initialExpense?.amount?.toString() ?? '');
  const [paidById, setPaidById] = useState(initialExpense?.paidById ?? participants[0]?.id ?? '');
  const [splitBetween, setSplitBetween] = useState<string[]>(
    initialExpense?.splitBetween ?? participants.map((p) => p.id)
  );
  const [splitType, setSplitType] = useState<'equal' | 'custom'>(initialExpense?.splitType ?? 'equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>(() => {
    if (initialExpense?.customSplits) {
      const map: Record<string, string> = {};
      initialExpense.customSplits.forEach((s) => { map[s.participantId] = s.amount.toString(); });
      return map;
    }
    return {};
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleSplit = (id: string) => {
    setSplitBetween((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const totalCustom = splitBetween.reduce((sum, id) => sum + (parseFloat(customSplits[id] || '0') || 0), 0);
  const amountNum = parseFloat(amount) || 0;
  const customDiff = Math.abs(totalCustom - amountNum);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!desc.trim()) errs.desc = 'Description is required.';
    if (!amount || amountNum <= 0) errs.amount = 'Enter a valid amount greater than 0.';
    if (splitBetween.length === 0) errs.split = 'Select at least one person.';
    if (splitType === 'custom' && customDiff > 0.01) errs.custom = `Custom amounts must add up to ${currency}${amountNum.toFixed(2)}. Currently ${currency}${totalCustom.toFixed(2)}.`;
    return errs;
  };

  const handleSave = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const expense: Expense = {
      id: initialExpense?.id ?? genId(),
      description: desc.trim(),
      amount: amountNum,
      paidById,
      splitBetween,
      splitType,
      customSplits:
        splitType === 'custom'
          ? splitBetween.map((id) => ({ participantId: id, amount: parseFloat(customSplits[id] || '0') || 0 }))
          : undefined,
    };
    onSave(expense);
  };

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-4">
      <h3 className="font-bold text-gray-900 text-base">{initialExpense ? 'Edit Expense' : 'Add Expense'}</h3>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
        <input
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="e.g. Hotel, Dinner, Taxi"
          className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition focus:border-[#1B998B] focus:ring-2 focus:ring-[#1B998B]/20 ${errors.desc ? 'border-[#E84545]' : 'border-gray-200'}`}
        />
        {errors.desc && <p className="text-[#E84545] text-xs mt-0.5">{errors.desc}</p>}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">{currency}</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className={`w-full border rounded-xl pl-8 pr-3 py-2.5 text-sm outline-none transition focus:border-[#1B998B] focus:ring-2 focus:ring-[#1B998B]/20 ${errors.amount ? 'border-[#E84545]' : 'border-gray-200'}`}
          />
        </div>
        {errors.amount && <p className="text-[#E84545] text-xs mt-0.5">{errors.amount}</p>}
      </div>

      {/* Paid by */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Paid by</label>
        <select
          value={paidById}
          onChange={(e) => setPaidById(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none transition focus:border-[#1B998B] focus:ring-2 focus:ring-[#1B998B]/20 bg-white"
        >
          {participants.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Split between */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Split between</label>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleSplit(p.id)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                splitBetween.includes(p.id)
                  ? 'bg-[#1B998B] border-[#1B998B] text-white'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        {errors.split && <p className="text-[#E84545] text-xs mt-0.5">{errors.split}</p>}
      </div>

      {/* Split type */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Split type</label>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
          {(['equal', 'custom'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSplitType(type)}
              className={`flex-1 py-2 text-xs font-semibold transition ${
                splitType === type ? 'bg-[#1B998B] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {type === 'equal' ? 'Equal split' : 'Custom amounts'}
            </button>
          ))}
        </div>
      </div>

      {/* Custom splits */}
      {splitType === 'custom' && splitBetween.length > 0 && (
        <div className="space-y-2">
          {splitBetween.map((id) => {
            const p = participants.find((x) => x.id === id);
            if (!p) return null;
            return (
              <div key={id} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-24 truncate">{p.name}</span>
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{currency}</span>
                  <input
                    type="number"
                    value={customSplits[id] ?? ''}
                    onChange={(e) => setCustomSplits((prev) => ({ ...prev, [id]: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-200 rounded-lg pl-6 pr-2 py-1.5 text-xs outline-none focus:border-[#1B998B] focus:ring-1 focus:ring-[#1B998B]/20"
                  />
                </div>
              </div>
            );
          })}
          <div className={`text-xs font-medium ${customDiff > 0.01 ? 'text-[#E84545]' : 'text-[#1B998B]'}`}>
            Total: {currency}{totalCustom.toFixed(2)} / {currency}{amountNum.toFixed(2)}
          </div>
          {errors.custom && <p className="text-[#E84545] text-xs">{errors.custom}</p>}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-2.5 bg-[#1B998B] text-white font-bold rounded-xl hover:bg-[#158a7d] transition text-sm"
        >
          {initialExpense ? 'Save Changes' : 'Add Expense'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step 2: Add Expenses ─────────────────────────────────────────────────────

function Step2({
  session,
  onUpdate,
  onNext,
  onBack,
}: {
  session: Session;
  onUpdate: (s: Partial<Session>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [showForm, setShowForm] = useState(session.expenses.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const addExpense = (expense: Expense) => {
    onUpdate({ expenses: [...session.expenses, expense] });
    setShowForm(false);
  };

  const updateExpense = (expense: Expense) => {
    onUpdate({ expenses: session.expenses.map((e) => (e.id === expense.id ? expense : e)) });
    setEditingId(null);
  };

  const deleteExpense = (id: string) => {
    onUpdate({ expenses: session.expenses.filter((e) => e.id !== id) });
  };

  const total = session.expenses.reduce((s, e) => s + e.amount, 0);

  const paidByName = (id: string) => session.participants.find((p) => p.id === id)?.name ?? id;
  const splitNames = (ids: string[]) => ids.map((id) => session.participants.find((p) => p.id === id)?.name ?? id).join(', ');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-base">{session.eventName}</h3>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-gray-500 hover:text-gray-700 transition"
        >
          ← Edit Group
        </button>
      </div>

      {/* Add expense button / form */}
      {showForm && !editingId ? (
        <ExpenseForm
          participants={session.participants}
          currency={session.currency}
          onSave={addExpense}
          onCancel={session.expenses.length > 0 ? () => setShowForm(false) : undefined}
        />
      ) : editingId ? null : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full py-3 border-2 border-dashed border-[#1B998B]/40 text-[#1B998B] font-semibold rounded-xl hover:border-[#1B998B] hover:bg-[#E8F8F6] transition text-sm"
        >
          + Add Expense
        </button>
      )}

      {/* Expense list */}
      {session.expenses.length === 0 && !showForm ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-3xl mb-2">🧾</p>
          <p className="text-sm">Add your first expense above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {session.expenses.map((exp) =>
            editingId === exp.id ? (
              <ExpenseForm
                key={exp.id}
                participants={session.participants}
                currency={session.currency}
                initialExpense={exp}
                onSave={updateExpense}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div key={exp.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{exp.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Paid by <span className="font-medium text-gray-600">{paidByName(exp.paidById)}</span>
                      {' · '}Split: {splitNames(exp.splitBetween)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900 text-sm">{session.currency}{exp.amount.toFixed(2)}</p>
                    <div className="flex gap-2 mt-1 justify-end">
                      <button
                        type="button"
                        onClick={() => { setEditingId(exp.id); setShowForm(false); }}
                        className="text-xs text-[#1B998B] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteExpense(exp.id)}
                        className="text-xs text-[#E84545] hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Running total */}
      {session.expenses.length > 0 && (
        <div className="flex items-center justify-between bg-[#E8F8F6] rounded-xl px-4 py-3 text-sm font-semibold text-[#1B998B]">
          <span>Total expenses</span>
          <span>{session.currency}{total.toFixed(2)}</span>
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={session.expenses.length === 0}
        className="w-full py-3.5 bg-[#1B998B] text-white font-bold rounded-xl hover:bg-[#158a7d] transition text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        See Results →
      </button>
    </div>
  );
}

// ─── Step 3: Results ──────────────────────────────────────────────────────────

function Step3({
  session,
  onBack,
  onCopyLink,
  onExportPDF,
  onExportExcel,
}: {
  session: Session;
  onBack: () => void;
  onCopyLink: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
}) {
  const balances = computeBalances(session.participants, session.expenses);
  const settlements = computeSettlements(balances);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-base">{session.eventName} — Results</h3>
        <button type="button" onClick={onBack} className="text-xs text-gray-500 hover:text-gray-700 transition">
          ← Edit Expenses
        </button>
      </div>

      {/* Balance table */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Balances</h4>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-4 gap-0 bg-gray-50 border-b border-gray-100 px-4 py-2">
            {['Person', 'Paid', 'Share', 'Net'].map((h) => (
              <div key={h} className="text-xs font-semibold text-gray-500">{h}</div>
            ))}
          </div>
          {balances.map((b) => (
            <div key={b.participantId} className="grid grid-cols-4 gap-0 px-4 py-3 border-b border-gray-50 last:border-0">
              <div className="text-sm font-medium text-gray-900 truncate pr-1">{b.name}</div>
              <div className="text-sm text-gray-700">{session.currency}{b.totalPaid.toFixed(2)}</div>
              <div className="text-sm text-gray-700">{session.currency}{b.fairShare.toFixed(2)}</div>
              <div className={`text-sm font-semibold ${b.net > 0.005 ? 'text-[#1B998B]' : b.net < -0.005 ? 'text-[#E84545]' : 'text-gray-500'}`}>
                {b.net > 0.005 ? '+' : ''}{session.currency}{b.net.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settlements */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Settlement Instructions</h4>
        {settlements.length === 0 ? (
          <div className="bg-[#E8F8F6] rounded-xl px-4 py-3 text-sm text-[#1B998B] font-medium">
            🎉 Everyone is settled up!
          </div>
        ) : (
          <div className="space-y-2">
            {settlements.map((s, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-sm shadow-sm flex items-center gap-2">
                <span className="font-semibold text-gray-900">{s.from}</span>
                <span className="text-gray-400">pays</span>
                <span className="font-semibold text-gray-900">{s.to}</span>
                <span className="ml-auto font-bold text-[#1B998B]">{session.currency}{s.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export + Share */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onCopyLink}
          className="flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition text-sm"
        >
          🔗 Copy Share Link
        </button>
        <button
          type="button"
          onClick={onExportPDF}
          className="flex items-center justify-center gap-2 py-3 bg-[#1B998B] text-white font-semibold rounded-xl hover:bg-[#158a7d] transition text-sm"
        >
          📄 Download PDF
        </button>
        <button
          type="button"
          onClick={onExportExcel}
          className="flex items-center justify-center gap-2 py-3 border border-[#1B998B] text-[#1B998B] font-semibold rounded-xl hover:bg-[#E8F8F6] transition text-sm"
        >
          📊 Download Excel
        </button>
      </div>
    </div>
  );
}

// ─── Main Tool Component ──────────────────────────────────────────────────────

export default function SplitTool() {
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [session, setSession] = useState<Session>({
    eventName: '',
    participants: [],
    expenses: [],
    currency: '₹',
  });

  // Restore from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const restored = decodeState(hash);
      if (restored) {
        setSession(restored);
        setStep(restored.expenses.length > 0 ? 3 : 2);
      }
    }
  }, []);

  // Sync hash when session changes
  useEffect(() => {
    if (session.participants.length > 0) {
      const encoded = encodeState(session);
      if (encoded) {
        window.history.replaceState(null, '', `#${encoded}`);
      }
    }
  }, [session]);

  const updateSession = useCallback((partial: Partial<Session>) => {
    setSession((prev) => ({ ...prev, ...partial }));
  }, []);

  const showToast = (msg: string) => setToast(msg);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied! Share it with your group.');
    } catch {
      showToast('Could not copy — please copy the URL manually.');
    }
  };

  const handleExportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      const primary = '#1B998B';
      const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

      // Title
      doc.setFontSize(20);
      doc.setTextColor(primary);
      doc.text(session.eventName || 'Expense Report', 14, 20);

      doc.setFontSize(10);
      doc.setTextColor('#6b7280');
      doc.text('Expense Report — Generated by Split It (split-it.xyz)', 14, 28);

      // Section 1: Expenses
      doc.setFontSize(12);
      doc.setTextColor('#111827');
      doc.text('Expenses', 14, 40);

      const paidByName = (id: string) => session.participants.find((p) => p.id === id)?.name ?? id;
      const splitNames = (ids: string[]) => ids.map((id) => session.participants.find((p) => p.id === id)?.name ?? id).join(', ');

      autoTable(doc, {
        startY: 44,
        head: [['Description', 'Amount', 'Paid By', 'Split Between']],
        body: session.expenses.map((e) => [
          e.description,
          `${session.currency}${e.amount.toFixed(2)}`,
          paidByName(e.paidById),
          splitNames(e.splitBetween),
        ]),
        headStyles: { fillColor: primary, textColor: '#ffffff', fontStyle: 'bold' },
        styles: { fontSize: 9 },
      });

      // Section 2: Balances
      const balances = computeBalances(session.participants, session.expenses);
      const finalY1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 100;
      doc.setFontSize(12);
      doc.setTextColor('#111827');
      doc.text('Balances', 14, finalY1 + 12);

      autoTable(doc, {
        startY: finalY1 + 16,
        head: [['Person', 'Total Paid', 'Fair Share', 'Net Balance']],
        body: balances.map((b) => [
          b.name,
          `${session.currency}${b.totalPaid.toFixed(2)}`,
          `${session.currency}${b.fairShare.toFixed(2)}`,
          `${b.net >= 0 ? '+' : ''}${session.currency}${b.net.toFixed(2)}`,
        ]),
        headStyles: { fillColor: primary, textColor: '#ffffff', fontStyle: 'bold' },
        styles: { fontSize: 9 },
      });

      // Section 3: Settlements
      const settlements = computeSettlements(balances);
      const finalY2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 150;
      doc.setFontSize(12);
      doc.setTextColor('#111827');
      doc.text('Settlement Instructions', 14, finalY2 + 12);

      autoTable(doc, {
        startY: finalY2 + 16,
        head: [['From', 'To', 'Amount']],
        body: settlements.length > 0
          ? settlements.map((s) => [s.from, s.to, `${session.currency}${s.amount.toFixed(2)}`])
          : [['—', '—', 'Everyone is settled up!']],
        headStyles: { fillColor: primary, textColor: '#ffffff', fontStyle: 'bold' },
        styles: { fontSize: 9 },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor('#9ca3af');
        doc.text(`Generated on ${date} · split-it.xyz`, 14, doc.internal.pageSize.height - 10);
      }

      const slug = (session.eventName || 'expenses').toLowerCase().replace(/\s+/g, '-');
      doc.save(`${slug}-expenses.pdf`);
      showToast('PDF downloaded!');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate PDF. Please try again.');
    }
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const paidByName = (id: string) => session.participants.find((p) => p.id === id)?.name ?? id;
      const splitNames = (ids: string[]) => ids.map((id) => session.participants.find((p) => p.id === id)?.name ?? id).join(', ');

      // Sheet 1: Expenses
      const expenseRows = [
        ['Description', 'Amount', 'Paid By', 'Split Between'],
        ...session.expenses.map((e) => [
          e.description,
          e.amount,
          paidByName(e.paidById),
          splitNames(e.splitBetween),
        ]),
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(expenseRows);
      XLSX.utils.book_append_sheet(wb, ws1, 'Expenses');

      // Sheet 2: Balances
      const balances = computeBalances(session.participants, session.expenses);
      const balanceRows = [
        ['Person', 'Total Paid', 'Fair Share', 'Net Balance'],
        ...balances.map((b) => [b.name, b.totalPaid, b.fairShare, b.net]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(balanceRows);
      XLSX.utils.book_append_sheet(wb, ws2, 'Balances');

      // Sheet 3: Settlements
      const settlements = computeSettlements(balances);
      const settlementRows = [
        ['From', 'To', 'Amount'],
        ...(settlements.length > 0 ? settlements.map((s) => [s.from, s.to, s.amount]) : [['—', '—', 'Everyone is settled up!']]),
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(settlementRows);
      XLSX.utils.book_append_sheet(wb, ws3, 'Settlements');

      const slug = (session.eventName || 'expenses').toLowerCase().replace(/\s+/g, '-');
      XLSX.writeFile(wb, `${slug}-expenses.xlsx`);
      showToast('Excel file downloaded!');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate Excel. Please try again.');
    }
  };

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <StepIndicator current={step} />

        {step === 1 && (
          <Step1 session={session} onUpdate={updateSession} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <Step2
            session={session}
            onUpdate={updateSession}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Step3
            session={session}
            onBack={() => setStep(2)}
            onCopyLink={handleCopyLink}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
          />
        )}
      </div>
    </>
  );
}

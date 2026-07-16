// src/components/money/TransactionItem.jsx
// One row in the transaction list — tap to edit, trash icon to delete.

import { formatMoney } from '@/utils/money'

const CATEGORY_ICONS = {
  Food: 'ti-tools-kitchen-2',
  Transport: 'ti-car',
  Shopping: 'ti-shopping-bag',
  'Bills & Rent': 'ti-file-invoice',
  Education: 'ti-books',
  Health: 'ti-heart-plus',
  Entertainment: 'ti-device-tv',
  'Pocket Money': 'ti-wallet',
  Salary: 'ti-briefcase',
  Freelance: 'ti-laptop',
  Gift: 'ti-gift',
}

export default function TransactionItem({ txn, onEdit, onDelete }) {
  const isIncome = txn.type === 'income'
  return (
    <div className="flex items-center gap-3 py-3 px-1 border-b border-slate-800/60 last:border-0">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          isIncome ? 'bg-emerald-500/10' : 'bg-rose-500/10'
        }`}
      >
        <i
          className={`ti ${CATEGORY_ICONS[txn.category] || 'ti-tag'} text-base ${
            isIncome ? 'text-emerald-400' : 'text-rose-400'
          }`}
        />
      </div>

      <button className="flex-1 min-w-0 text-left" onClick={() => onEdit(txn)}>
        <p className="text-sm font-medium text-slate-200 truncate">{txn.category}</p>
        {txn.note && <p className="text-xs text-slate-600 truncate">{txn.note}</p>}
      </button>

      <p className={`text-sm font-bold font-mono shrink-0 ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isIncome ? '+' : '-'}{formatMoney(txn.amount)}
      </p>

      <button
        onClick={() => onDelete(txn._id)}
        className="text-slate-700 hover:text-rose-500 text-sm px-1.5 shrink-0"
        title="Delete"
      >
        <i className="ti ti-trash" />
      </button>
    </div>
  )
}
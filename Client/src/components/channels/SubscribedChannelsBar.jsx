// src/components/channels/SubscribedChannelsBar.jsx
export default function SubscribedChannelsBar({ subscriptions, activeChannelId, onSelect, onUnsubscribe }) {
  if (!subscriptions.length) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 px-3 py-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
        <i className="ti ti-info-circle text-slate-600" />
        Abhi koi channel subscribe nahi kiya — upar search karke shuru karo.
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-4 -mx-1 px-1">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          !activeChannelId
            ? 'bg-orange-500 border-orange-500 text-white'
            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
        }`}
      >
        All
      </button>
      {subscriptions.map((sub) => (
        <div key={sub._id} className="relative group shrink-0">
          <button
            onClick={() => onSelect(sub.channelId)}
            className={`flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              activeChannelId === sub.channelId
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            {sub.channelThumbnail ? (
              <img src={sub.channelThumbnail} alt="" className="w-5 h-5 rounded-full" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-slate-600" />
            )}
            <span className="truncate max-w-[100px]">{sub.channelTitle}</span>
          </button>
          <button
            onClick={() => onUnsubscribe(sub)}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-900 border border-slate-700 text-slate-400 flex items-center justify-center text-[10px] opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40"
            title="Unsubscribe"
          >
            <i className="ti ti-x" />
          </button>
        </div>
      ))}
    </div>
  )
}
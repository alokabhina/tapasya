// src/components/channels/ChannelEmbedPlayer.jsx
// Instead of syncing/caching a channel's videos into our DB (which needs a
// cron job and only shows what we've fetched), we embed the channel's real
// "uploads" playlist directly from YouTube. Opening a subscribed channel
// here shows exactly what YouTube shows for that channel right now — always
// current, zero extra API quota, nothing to keep in sync.

export default function ChannelEmbedPlayer({ subscription }) {
  if (!subscription) {
    return (
      <div className="text-center py-16 text-slate-500">
        <i className="ti ti-brand-youtube text-4xl mb-2 block" />
        <p className="text-sm">Upar se ek channel select karo uske videos dekhne ke liye</p>
      </div>
    )
  }

  if (!subscription.uploadsPlaylistId) {
    return (
      <div className="text-center py-16 text-slate-500 text-sm">
        Is channel ki uploads playlist nahi mili — dobara subscribe karke try karo
      </div>
    )
  }

  // modestbranding + rel=0 keep it to this channel only — no random suggestions
  const src = `https://www.youtube.com/embed/videoseries?list=${subscription.uploadsPlaylistId}&modestbranding=1&rel=0`

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {subscription.channelThumbnail ? (
          <img src={subscription.channelThumbnail} alt="" className="w-7 h-7 rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-slate-700" />
        )}
        <span className="text-sm font-medium text-slate-200">{subscription.channelTitle}</span>
      </div>
      <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          key={subscription.channelId}
          src={src}
          title={subscription.channelTitle}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}
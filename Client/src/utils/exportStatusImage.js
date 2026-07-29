// src/utils/exportStatusImage.js
// Status story card ko high-res PNG bana kar seedha share (WhatsApp/Insta) ya download karta hai.
//
// options.preferShare: true → pehle navigator.share try karo (sirf real user-click ke andar
// se call karo, warna browser "must be called from a user gesture" error dega).
// Auto/background capture ke liye preferShare:false rakho — seedha download hoga.

export async function exportStatusImage(node, filename = 'Tapasya_Status', options = {}) {
  const { preferShare = true } = options
  if (!node) throw new Error('Capture node not found')

  const { toBlob } = await import('html-to-image')

  // Node ka apna layout width/height use karo, na ki getBoundingClientRect —
  // node ab ek zero-size overflow:hidden wrapper ke andar rehta hai, isliye
  // bounding rect kabhi 0 aa sakta hai. offsetWidth/offsetHeight layout se
  // aate hain, screen position se independent.
  const width = node.offsetWidth || 390
  const height = node.offsetHeight || 693

  const captureOpts = {
    pixelRatio: 3,
    width,
    height,
    canvasWidth: width * 3,
    canvasHeight: height * 3,
    cacheBust: true,
    // agar koi image (jaise abhi tak na daala gaya avatar) load na ho paye,
    // toh poora capture blank hone ke bajaye ek transparent 1x1 fallback use ho
    imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    filter: (el) => !el.classList?.contains?.('capture-hide'),
  }

  // First paint can miss webfonts/images that were still loading — html-to-image
  // recommends a throwaway render before the real capture for this reason.
  await toBlob(node, captureOpts)
  const blob = await toBlob(node, captureOpts)
  if (!blob) throw new Error('Capture failed — empty image')

  if (preferShare && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], `${filename}.png`, { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Tapasya Status' })
        return
      }
    } catch (err) {
      if (err?.name === 'AbortError') return // user ne share sheet cancel kiya
      // fall through to direct download
    }
  }

  const dataUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = `${filename}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(dataUrl)
}
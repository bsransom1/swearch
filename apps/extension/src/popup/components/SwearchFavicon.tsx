/** 16px Swearch extension icon for inline assistant branding. */
export default function SwearchFavicon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <img
      src={chrome.runtime.getURL("icons/icon16.png")}
      alt=""
      aria-hidden
      className={`flex-shrink-0 ${className}`}
    />
  );
}

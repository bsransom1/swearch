/** Small Google Drive icon for settings and connection status. */
export default function GoogleDriveIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#0066DA" d="M7.71 3.5 1.15 15h6.56L14.29 3.5H7.71z" />
      <path fill="#00AC47" d="M16.29 3.5 9.73 15h6.56L22.85 3.5h-6.56z" />
      <path fill="#EA4335" d="M1.15 15 7.71 3.5h6.58L7.71 15H1.15z" />
      <path fill="#00832D" d="M9.73 15 16.29 3.5h6.56L16.29 15H9.73z" />
      <path fill="#2684FC" d="M1.15 15 7.71 21.5h8.58L22.85 15H1.15z" />
      <path fill="#FFBA00" d="M7.71 21.5 14.29 15h8.56L16.29 21.5H7.71z" />
    </svg>
  );
}

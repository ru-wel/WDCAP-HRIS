export const downloadBlobFile = ({ filename, blob }) => {
  if (!blob) return;
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  a.style.display = 'none';
  document.body.appendChild(a);

  try {
    a.click();
  } finally {
    a.remove();
    // Delay revocation to avoid Safari dropping the download.
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
};

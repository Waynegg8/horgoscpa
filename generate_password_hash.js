// 生成 SHA-256 密碼雜湊
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 生成密碼雜湊
(async () => {
  console.log('admin123:', await hashPassword('admin123'));
  console.log('employee123:', await hashPassword('employee123'));
})();


// Kirim notifikasi ke webhook Discord ke-9 setiap kali ada perubahan
// di dashboard: update keuangan, laporan pengeluaran, atau perubahan susunan tim.
async function sendDashboardLog({ action, actor, detail }) {
  const webhookUrl = process.env.WEBHOOK_DASHBOARD_LOG;
  if (!webhookUrl) {
    console.warn('WEBHOOK_DASHBOARD_LOG belum diatur, log tidak dikirim.');
    return;
  }

  const payload = {
    embeds: [
      {
        title: `🛠️ Aktivitas Dashboard: ${action}`,
        color: 3900151,
        fields: [
          { name: 'Dilakukan oleh', value: actor || 'Tidak diketahui', inline: true },
          { name: 'Detail', value: String(detail || '-').slice(0, 1000) }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'Log Dashboard Admin' }
      }
    ]
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error('Gagal mengirim log webhook dashboard:', e);
  }
}

module.exports = { sendDashboardLog };

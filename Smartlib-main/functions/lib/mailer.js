const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Kirim email menggunakan SendGrid
 */
async function sendEmail(to, subject, html) {
  const msg = {
    to,
    from: process.env.SENDER_EMAIL, // HARUS diverifikasi SendGrid
    subject,
    html
  };

  try {
    await sgMail.send(msg);
    console.log("Email berhasil dikirim ke", to);
  } catch (err) {
    console.error("Gagal mengirim email:", err);
  }
}

module.exports = { sendEmail };

const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');

// TODO: Set SENDGRID_API_KEY via firebase functions:config:set sendgrid.key "your-key"
// Fallback ke nodemailer jika SendGrid gagal
sgMail.setApiKey(functions.config().sendgrid?.key || 'SENDGRID_API_KEY'); // Placeholder

const transporter = nodemailer.createTransporter({
  service: 'gmail', // Atau SMTP lain
  auth: {
    user: 'your-email@gmail.com', // Placeholder
    pass: 'your-password' // Placeholder - gunakan app password
  }
});

async function sendEmail(to, subject, text) {
  try {
    // Coba SendGrid dulu
    await sgMail.send({
      to,
      from: 'noreply@smkn3manado.edu', // Placeholder
      subject,
      text
    });
  } catch (error) {
    // Fallback ke nodemailer
    await transporter.sendMail({
      from: 'noreply@smkn3manado.edu',
      to,
      subject,
      text
    });
  }
}

module.exports = { sendEmail };

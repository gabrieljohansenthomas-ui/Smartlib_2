/**
 * mailer.js
 * Wrapper around SendGrid (preferred) with fallback to console logging.
 * Configured via functions.config().sendgrid.key and functions.config().sendgrid.from
 *
 * Usage:
 * const { sendMail } = require('./lib/mailer');
 * await sendMail('to@example.com', 'Subject', '<p>HTML</p>');
 */

const functions = require('firebase-functions');

let provider = null;

try {
  const sendgridKey = functions.config().sendgrid && functions.config().sendgrid.key;
  const sendgridFrom = functions.config().sendgrid && functions.config().sendgrid.from;
  if (sendgridKey && sendgridFrom) {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(sendgridKey);
    provider = {
      send: async (to, subject, html) => {
        const msg = {
          to,
          from: sendgridFrom,
          subject,
          html
        };
        return sgMail.send(msg);
      }
    };
  } else {
    // Fallback: just log to console (useful in emulator or if not configured)
    provider = {
      send: async (to, subject, html) => {
        console.log('[mail fallback] to:', to, 'subject:', subject, 'html:', html);
        return Promise.resolve();
      }
    };
  }
} catch (err) {
  console.error('Mailer init error', err);
  provider = {
    send: async (to, subject, html) => {
      console.log('[mail fallback-exception] to:', to, 'subject:', subject);
      return Promise.resolve();
    }
  };
}

async function sendMail(to, subject, html) {
  return provider.send(to, subject, html);
}

module.exports = { sendMail };

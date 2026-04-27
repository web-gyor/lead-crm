const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async (options) => {

  // ✅ DEMO MODE CHECK (ADD THIS FIRST)
  if (process.env.ENABLE_EMAIL !== 'true') {
    console.log('📧 Email skipped (demo mode)');
    return { success: true, demo: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // important for Gmail SMTP
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"Webgyor CRM" <${process.env.SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent:', info.messageId);
    return info;

  } catch (error) {
    console.log('❌ Email error:', error.message);
    return null;
  }
};

module.exports = sendEmail;
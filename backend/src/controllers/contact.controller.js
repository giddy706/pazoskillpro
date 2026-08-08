const { asyncHandler } = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) return null;
    transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    });
    return transporter;
}

exports.sendMessage = asyncHandler(async (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
        return error(res, 'All fields are required', 400);
    }

    const toEmail = process.env.CONTACT_EMAIL || 'info@pazoskill.online';
    const transport = getTransporter();

    if (transport) {
        try {
            await transport.sendMail({
                from: `"PazoSkill Contact" <${process.env.SMTP_USER}>`,
                to: toEmail,
                replyTo: email,
                subject: `[PazoSkill] ${subject}`,
                text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
                html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                    <h2 style="color:#2563EB;">New Contact Message</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <hr>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                </div>`,
            });
        } catch (mailErr) {
            console.error('Email send failed:', mailErr.message);
        }
    }

    return success(res, {
        message: 'Your message has been received. We will get back to you within 24 hours.',
        delivered: !!transport,
    });
});

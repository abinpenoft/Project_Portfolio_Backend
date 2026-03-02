import 'dotenv/config';
import axios from 'axios';

/**
 * Brevo SMS Service Configuration
 * Uses Brevo's Transactional SMS API for sending SMS messages
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER = process.env.BREVO_SMS_SENDER || 'MessageSend';
const BREVO_SMS_API = 'https://api.brevo.com/v3/transactionalSMS/sms';

if (!BREVO_API_KEY) {
    console.warn('⚠️  BREVO_API_KEY not configured. SMS service will not work.');
}

/**
 * Normalise any Indian phone number to +91XXXXXXXXXX format.
 * Handles common DB storage variants: 91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX
 * and double-prefix cases like +91917561076398 (always takes last 10 digits).
 */
const normalisePhone = (raw) => {
    const digits = raw.trim().replace(/\D/g, ''); // strip everything except digits
    return '+91' + digits.slice(-10);             // always take last 10 digits
};

/**
 * Send SMS via Brevo
 * @param {string} phoneNumber - Recipient phone number (any common format)
 * @param {string} message - SMS content
 * @returns {Promise<Object>} Response from Brevo API
 */
export const sendBrevoSMS = async (phoneNumber, message) => {
    if (!BREVO_API_KEY) {
        throw new Error('Brevo API key is not configured.');
    }

    const recipient = normalisePhone(phoneNumber);

    // ── Dev sandbox mode ──────────────────────────────────────────────────────
    // In development, log instead of hitting the real API (saves credits)
    if (process.env.NODE_ENV === 'development') {
        console.log('📱 [SMS Sandbox] Would send SMS:');
        console.log(`   To     : ${recipient}`);
        console.log(`   Message: ${message}`);
        return { success: true, data: { sandbox: true } };
    }
    // ─────────────────────────────────────────────────────────────────────────

    try {
        const response = await axios.post(
            BREVO_SMS_API,
            {
                sender: BREVO_SENDER,
                recipient,
                content: message,
                type: 'transactional',
            },
            {
                headers: {
                    'api-key': BREVO_API_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log(`✅ SMS sent to ${phoneNumber}`);
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ Brevo SMS Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to send SMS via Brevo');
    }
};

export default { sendBrevoSMS };

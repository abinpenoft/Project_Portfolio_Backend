import pool from '../configs/db.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { sendEnquiryReplyEmail } from '../utils/email.js';
import { sendBrevoSMS } from '../configs/sms.js';
import { sendWhatsAppMessage, sendWhatsAppInteractive } from '../configs/whatsapp.js';

// ─────────────────────────────────────────────────────────────
//  GET /api/campaigns  — Admin: list campaigns
// ─────────────────────────────────────────────────────────────
export const getCampaigns = async (req, res) => {
    const { status, channel } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const offset = (page - 1) * limit;

    try {
        let where = 'WHERE 1=1';
        const params = [];

        if (status && status !== 'all') { where += ' AND c.status = ?'; params.push(status); }
        if (channel && channel !== 'all') { where += ' AND c.channel = ?'; params.push(channel); }

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM campaigns c ${where}`, params
        );

        const [rows] = await pool.query(
            `SELECT c.*, t.name AS template_name
             FROM campaigns c
             LEFT JOIN message_templates t ON t.id = c.template_id
             ${where}
             ORDER BY c.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return successResponse(res, {
            data: rows,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        }, 'Campaigns fetched.');
    } catch (err) {
        console.error('[getCampaigns]', err);
        return errorResponse(res, 'Failed to fetch campaigns.');
    }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/campaigns/:id  — Admin: single campaign
// ─────────────────────────────────────────────────────────────
export const getCampaignById = async (req, res) => {
    try {
        const [[row]] = await pool.query(
            `SELECT c.*, t.name AS template_name, t.content AS template_content, t.type AS template_type
             FROM campaigns c
             LEFT JOIN message_templates t ON t.id = c.template_id
             WHERE c.id = ?`,
            [req.params.id]
        );
        if (!row) return errorResponse(res, 'Campaign not found.', 404);
        return successResponse(res, { data: row }, 'Campaign fetched.');
    } catch (err) {
        console.error('[getCampaignById]', err);
        return errorResponse(res, 'Failed to fetch campaign.');
    }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/campaigns  — Admin: create campaign
// ─────────────────────────────────────────────────────────────
export const createCampaign = async (req, res) => {
    const {
        name, channel, target_category, target_status, target_panchayat_id,
        template_id, message, scheduled_at, notes
    } = req.body;

    if (!name?.trim()) return errorResponse(res, 'Campaign name is required.', 400);
    if (!channel || !['sms', 'whatsapp', 'email'].includes(channel)) {
        return errorResponse(res, 'Channel must be sms, whatsapp, or email.', 400);
    }
    if (!message?.trim() && !template_id) {
        return errorResponse(res, 'Either message or template_id is required.', 400);
    }

    try {
        const [result] = await pool.query(
            `INSERT INTO campaigns
             (name, channel, target_category, target_status, target_panchayat_id,
              template_id, message, scheduled_at, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(), channel,
                target_category || null,
                target_status || null,
                target_panchayat_id || null,
                template_id || null,
                message?.trim() || null,
                scheduled_at || null,
                notes?.trim() || null,
            ]
        );
        return successResponse(res, { id: result.insertId }, 'Campaign created.', 201);
    } catch (err) {
        console.error('[createCampaign]', err);
        return errorResponse(res, 'Failed to create campaign.');
    }
};

// ─────────────────────────────────────────────────────────────
//  PUT /api/campaigns/:id  — Admin: update draft campaign
// ─────────────────────────────────────────────────────────────
export const updateCampaign = async (req, res) => {
    const {
        name, channel, target_category, target_status, target_panchayat_id,
        template_id, message, scheduled_at, notes
    } = req.body;

    try {
        const [[existing]] = await pool.query('SELECT id, status FROM campaigns WHERE id = ?', [req.params.id]);
        if (!existing) return errorResponse(res, 'Campaign not found.', 404);
        if (existing.status !== 'draft') {
            return errorResponse(res, 'Only draft campaigns can be edited.', 400);
        }

        await pool.query(
            `UPDATE campaigns SET
                name = COALESCE(?, name),
                channel = COALESCE(?, channel),
                target_category = ?,
                target_status = ?,
                target_panchayat_id = ?,
                template_id = ?,
                message = ?,
                scheduled_at = ?,
                notes = ?
             WHERE id = ?`,
            [
                name?.trim() || null,
                channel || null,
                target_category || null,
                target_status || null,
                target_panchayat_id || null,
                template_id || null,
                message?.trim() || null,
                scheduled_at || null,
                notes?.trim() || null,
                req.params.id,
            ]
        );
        return successResponse(res, null, 'Campaign updated.');
    } catch (err) {
        console.error('[updateCampaign]', err);
        return errorResponse(res, 'Failed to update campaign.');
    }
};

// ─────────────────────────────────────────────────────────────
//  DELETE /api/campaigns/:id  — Admin: delete campaign
// ─────────────────────────────────────────────────────────────
export const deleteCampaign = async (req, res) => {
    try {
        const [r] = await pool.query('DELETE FROM campaigns WHERE id = ?', [req.params.id]);
        if (r.affectedRows === 0) return errorResponse(res, 'Campaign not found.', 404);
        return successResponse(res, null, 'Campaign deleted.');
    } catch (err) {
        console.error('[deleteCampaign]', err);
        return errorResponse(res, 'Failed to delete campaign.');
    }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/campaigns/:id/launch  — Admin: execute campaign
// ─────────────────────────────────────────────────────────────
export const launchCampaign = async (req, res) => {
    try {
        const [[campaign]] = await pool.query('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
        if (!campaign) return errorResponse(res, 'Campaign not found.', 404);
        if (campaign.status !== 'draft') {
            return errorResponse(res, 'Only draft campaigns can be launched.', 400);
        }

        // Mark as running
        await pool.query('UPDATE campaigns SET status = ? WHERE id = ?', ['running', campaign.id]);

        // Build recipient query
        let where = 'WHERE 1=1';
        const params = [];
        if (campaign.target_category) { where += ' AND category = ?'; params.push(campaign.target_category); }
        if (campaign.target_status) { where += ' AND status = ?'; params.push(campaign.target_status); }
        if (campaign.target_panchayat_id) { where += ' AND panchayat_id = ?'; params.push(campaign.target_panchayat_id); }

        const [recipients] = await pool.query(
            `SELECT id, full_name, mobile, email, subject FROM contact_enquiries ${where}`,
            params
        );

        // Fetch template if set
        let template = null;
        if (campaign.template_id) {
            const [[tmpl]] = await pool.query('SELECT * FROM message_templates WHERE id = ?', [campaign.template_id]);
            template = tmpl;
        }

        const totals = { sent: 0, failed: 0, total: recipients.length };

        await pool.query('UPDATE campaigns SET total_count = ? WHERE id = ?', [totals.total, campaign.id]);

        for (const target of recipients) {
            try {
                let finalMessage = campaign.message || template?.content || '';
                finalMessage = finalMessage.replace(/{name}/g, target.full_name || '');
                finalMessage = finalMessage.replace(/{email}/g, target.email || '');
                finalMessage = finalMessage.replace(/{mobile}/g, target.mobile || '');

                if (campaign.channel === 'sms') {
                    let phone = target.mobile.trim();
                    if (!phone.startsWith('+')) phone = phone.startsWith('0') ? '+91' + phone.substring(1) : '+91' + phone;
                    await sendBrevoSMS(phone, finalMessage);
                } else if (campaign.channel === 'email') {
                    await sendEnquiryReplyEmail({
                        to: target.email,
                        full_name: target.full_name,
                        subject: template?.subject || target.subject || 'Campaign Update',
                        replyMessage: finalMessage,
                    });
                } else if (campaign.channel === 'whatsapp') {
                    let phone = target.mobile.trim();
                    if (phone.startsWith('+')) phone = phone.substring(1);
                    if (phone.startsWith('0')) phone = '91' + phone.substring(1);
                    if (!phone.startsWith('91') && phone.length === 10) phone = '91' + phone;

                    if (template?.type === 'whatsapp') {
                        const buttons = typeof template.buttons_json === 'string' ? JSON.parse(template.buttons_json) : template.buttons_json;
                        const header = template.header_type !== 'none' ? { type: template.header_type, url: template.header_url } : null;
                        if (buttons?.length > 0 || (header && header.type !== 'none' && header.type !== 'text')) {
                            await sendWhatsAppInteractive(phone, header, finalMessage, buttons || []);
                        } else {
                            await sendWhatsAppMessage(phone, finalMessage);
                        }
                    } else {
                        await sendWhatsAppMessage(phone, finalMessage);
                    }
                }

                // Log to enquiry_communications
                await pool.query(
                    `INSERT INTO enquiry_communications (enquiry_id, template_id, type, recipient, message, status)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        target.id,
                        campaign.template_id || null,
                        campaign.channel,
                        campaign.channel === 'email' ? target.email : target.mobile,
                        finalMessage,
                        'sent'
                    ]
                ).catch(e => console.error('[Campaign:LogComm]', e));

                totals.sent++;
            } catch (err) {
                console.error(`[Campaign:SendFail] target=${target.id}:`, err.message);
                totals.failed++;
            }
        }

        // Finalise campaign status
        const finalStatus = totals.failed === totals.total && totals.total > 0 ? 'failed' : 'completed';
        await pool.query(
            'UPDATE campaigns SET status = ?, sent_count = ?, failed_count = ? WHERE id = ?',
            [finalStatus, totals.sent, totals.failed, campaign.id]
        );

        return successResponse(res, { data: totals }, `Campaign ${finalStatus}.`);
    } catch (err) {
        console.error('[launchCampaign]', err);
        await pool.query('UPDATE campaigns SET status = ? WHERE id = ?', ['failed', req.params.id]).catch(() => { });
        return errorResponse(res, 'Campaign launch failed.');
    }
};

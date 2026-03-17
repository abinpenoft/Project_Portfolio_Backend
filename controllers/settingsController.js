import db from '../configs/db.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

// Get all settings
export const getAllSettings = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT setting_key, setting_value, description FROM site_settings');
        // Transform array to key-value object for easier frontend use
        const settingsMap = rows.reduce((acc, row) => {
            acc[row.setting_key] = row.setting_value;
            return acc;
        }, {});
        return successResponse(res, { data: settingsMap }, 'Settings fetched successfully.');
    } catch (err) {
        console.error('[getAllSettings]', err);
        return errorResponse(res, 'Server error fetching settings.');
    }
};

// Update multiple settings at once
export const updateSettings = async (req, res) => {
    const { settings } = req.body; // Expecting { "key1": "value1", "key2": "value2" }

    if (!settings || typeof settings !== 'object') {
        return errorResponse(res, 'Invalid settings data provided.', 400);
    }

    try {
        const keys = Object.keys(settings);
        if (keys.length === 0) {
            return successResponse(res, null, 'No settings to update.');
        }

        // We use a transaction to ensure all or none are updated
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            for (const key of keys) {
                await connection.query(
                    'UPDATE site_settings SET setting_value = ? WHERE setting_key = ?',
                    [settings[key], key]
                );
            }

            await connection.commit();
            return successResponse(res, null, 'Settings updated successfully.');
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error('[updateSettings]', err);
        return errorResponse(res, 'Server error updating settings.');
    }
};

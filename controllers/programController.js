import db from '../configs/db.js';
import { successResponse, errorResponse, slugify } from '../utils/helpers.js';
import { uploadMediaFields, runMulter } from '../configs/multer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get all programs
export const getAllPrograms = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM programs ORDER BY created_at DESC');
        
        // Fetch media count for each program if needed, or just return basic info
        return successResponse(res, { data: rows }, 'Programs fetched successfully.');
    } catch (err) {
        console.error('[getAllPrograms]', err);
        return errorResponse(res, 'Server error fetching programs.');
    }
};

// Get program by ID with media
export const getProgramById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM programs WHERE id = ?', [id]);
        
        if (!rows.length) return errorResponse(res, 'Program not found.', 404);
        
        const [media] = await db.query('SELECT * FROM program_media WHERE program_id = ? ORDER BY order_index ASC', [id]);
        
        return successResponse(res, {
            data: {
                ...rows[0],
                media: media
            }
        }, 'Program details fetched.');
    } catch (err) {
        console.error('[getProgramById]', err);
        return errorResponse(res, 'Server error fetching program details.');
    }
};

// Get program by SLUG with media
export const getProgramBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const [rows] = await db.query('SELECT * FROM programs WHERE slug = ?', [slug]);
        
        if (!rows.length) return errorResponse(res, 'Program not found.', 404);
        
        const programId = rows[0].id;
        const [media] = await db.query('SELECT * FROM program_media WHERE program_id = ? ORDER BY order_index ASC', [programId]);
        
        return successResponse(res, {
            data: {
                ...rows[0],
                media: media
            }
        }, 'Program details fetched.');
    } catch (err) {
        console.error('[getProgramBySlug]', err);
        return errorResponse(res, 'Server error fetching program details.');
    }
};

// Create program
export const createProgram = async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title) return errorResponse(res, 'Title is required.', 400);

        // Generate unique slug
        let baseSlug = slugify(title);
        let slug = baseSlug;
        let counter = 1;
        while (true) {
            const [existing] = await db.query('SELECT id FROM programs WHERE slug = ?', [slug]);
            if (existing.length === 0) break;
            slug = `${baseSlug}-${counter++}`;
        }

        const [result] = await db.query(
            'INSERT INTO programs (title, slug, description) VALUES (?, ?, ?)',
            [title, slug, description || null]
        );

        const [rows] = await db.query('SELECT * FROM programs WHERE id = ?', [result.insertId]);
        return successResponse(res, { data: rows[0] }, 'Program created successfully.', 201);
    } catch (err) {
        console.error('[createProgram]', err);
        return errorResponse(res, 'Server error creating program.');
    }
};

// Update program
export const updateProgram = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description } = req.body;

        if (!title) return errorResponse(res, 'Title is required.', 400);

        // Generate unique slug if title changed
        const [[oldProg]] = await db.query('SELECT title, slug FROM programs WHERE id = ?', [id]);
        if (!oldProg) return errorResponse(res, 'Program not found.', 404);

        let slug = oldProg.slug;
        if (title !== oldProg.title) {
            let baseSlug = slugify(title);
            slug = baseSlug;
            let counter = 1;
            while (true) {
                const [existing] = await db.query('SELECT id FROM programs WHERE slug = ? AND id != ?', [slug, id]);
                if (existing.length === 0) break;
                slug = `${baseSlug}-${counter++}`;
            }
        }

        const [result] = await db.query(
            'UPDATE programs SET title = ?, slug = ?, description = ? WHERE id = ?',
            [title, slug, description || null, id]
        );

        if (!result.affectedRows) return errorResponse(res, 'Program not found.', 404);

        const [rows] = await db.query('SELECT * FROM programs WHERE id = ?', [id]);
        return successResponse(res, { data: rows[0] }, 'Program updated successfully.');
    } catch (err) {
        console.error('[updateProgram]', err);
        return errorResponse(res, 'Server error updating program.');
    }
};

// Delete program
export const deleteProgram = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch media to delete files
        const [media] = await db.query('SELECT file_url, thumbnail_url FROM program_media WHERE program_id = ?', [id]);
        
        for (const item of media) {
            const filePath = path.join(__dirname, '..', item.file_url);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            
            if (item.thumbnail_url) {
                const thumbPath = path.join(__dirname, '..', item.thumbnail_url);
                if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
            }
        }

        const [result] = await db.query('DELETE FROM programs WHERE id = ?', [id]);
        if (!result.affectedRows) return errorResponse(res, 'Program not found.', 404);

        return successResponse(res, {}, 'Program deleted successfully.');
    } catch (err) {
        console.error('[deleteProgram]', err);
        return errorResponse(res, 'Server error deleting program.');
    }
};

// Add media to program
export const addProgramMedia = async (req, res) => {
    try {
        await runMulter(uploadMediaFields, req, res);

        const { id } = req.params;
        const { media_type, caption } = req.body;

        const mainFile = req.files?.file?.[0];
        const thumbFile = req.files?.thumbnail?.[0];

        if (!mainFile) return errorResponse(res, 'No file uploaded.', 400);

        const fileUrl = `uploads/${mainFile.filename}`;
        const thumbnailUrl = thumbFile ? `uploads/${thumbFile.filename}` : null;

        const [result] = await db.query(
            'INSERT INTO program_media (program_id, media_type, file_url, thumbnail_url, caption) VALUES (?, ?, ?, ?, ?)',
            [id, media_type, fileUrl, thumbnailUrl, caption || null]
        );

        const [rows] = await db.query('SELECT * FROM program_media WHERE id = ?', [result.insertId]);
        return successResponse(res, { data: rows[0] }, 'Media added successfully.', 201);
    } catch (err) {
        console.error('[addProgramMedia]', err);
        return errorResponse(res, 'Server error adding media.');
    }
};

// Delete specific media
export const deleteProgramMedia = async (req, res) => {
    try {
        const { mediaId } = req.params;

        const [rows] = await db.query('SELECT * FROM program_media WHERE id = ?', [mediaId]);
        if (!rows.length) return errorResponse(res, 'Media not found.', 404);

        const item = rows[0];
        const filePath = path.join(__dirname, '..', item.file_url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        
        if (item.thumbnail_url) {
            const thumbPath = path.join(__dirname, '..', item.thumbnail_url);
            if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
        }

        await db.query('DELETE FROM program_media WHERE id = ?', [mediaId]);
        return successResponse(res, {}, 'Media deleted successfully.');
    } catch (err) {
        console.error('[deleteProgramMedia]', err);
        return errorResponse(res, 'Server error deleting media.');
    }
};

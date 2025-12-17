/**
 * Products Routes
 * 
 * Handles product-related operations:
 * - GET /products - List all products
 * - GET /products/:id - Get single product
 * - GET /products/:id/images - Get product images
 * - GET /image-proxy - Proxy images from WordPress
 * - GET /debug/images/:productId - Debug image data (dev only)
 */

const express = require('express');
const https = require('https');
const http = require('http');
const db = require('../db');
const { fixImageUrl, isAllowedImageDomain, isPrivateOrInternalHost } = require('../utils/imageUtils');

const router = express.Router();

/**
 * GET /products
 * Returns a list of all published products with basic info
 */
router.get('/products', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = parseInt(req.query.offset) || 0;

        const query = `
            SELECT 
                p.ID as id,
                p.post_title as name,
                p.post_excerpt as short_description,
                p.post_content as description,
                p.post_date as created_at,
                p.post_modified as updated_at,
                (SELECT pm.meta_value FROM el1postmeta pm WHERE pm.post_id = p.ID AND pm.meta_key = '_thumbnail_id' LIMIT 1) as thumbnail_id,
                (SELECT img.guid FROM el1posts img WHERE img.ID = CAST((SELECT pm.meta_value FROM el1postmeta pm WHERE pm.post_id = p.ID AND pm.meta_key = '_thumbnail_id' LIMIT 1) AS UNSIGNED) AND img.post_type = 'attachment' LIMIT 1) as thumbnail_url
            FROM el1posts p
            WHERE p.post_type = 'product' 
              AND p.post_status = 'publish'
            ORDER BY p.post_date DESC
            LIMIT ? OFFSET ?
        `;

        const [products] = await db.query(query, [limit, offset]);

        const productsWithFixedUrls = products.map(product => ({
            ...product,
            thumbnail_url: fixImageUrl(product.thumbnail_url)
        }));

        const [countResult] = await db.query(
            "SELECT COUNT(*) as total FROM el1posts WHERE post_type = 'product' AND post_status = 'publish'"
        );

        res.json({
            products: productsWithFixedUrls,
            pagination: {
                limit,
                offset,
                total: parseInt(countResult[0].total)
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania produktów.' });
    }
});

/**
 * GET /products/:id
 * Returns a single product with full details including images
 */
router.get('/products/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);

        if (!productId || isNaN(productId)) {
            return res.status(400).json({ message: 'Nieprawidłowe ID produktu.' });
        }

        const [products] = await db.query(`
            SELECT 
                p.ID as id,
                p.post_title as name,
                p.post_excerpt as short_description,
                p.post_content as description,
                p.post_date as created_at,
                p.post_modified as updated_at
            FROM el1posts p
            WHERE p.ID = ? 
              AND p.post_type = 'product' 
              AND p.post_status = 'publish'
        `, [productId]);

        if (products.length === 0) {
            return res.status(404).json({ message: 'Nie znaleziono produktu.' });
        }

        const product = products[0];

        // Get featured image
        const [thumbnailMeta] = await db.query(`
            SELECT meta_value 
            FROM el1postmeta 
            WHERE post_id = ? AND meta_key = '_thumbnail_id'
        `, [productId]);

        let featuredImage = null;
        if (thumbnailMeta.length > 0 && thumbnailMeta[0].meta_value) {
            const thumbnailId = parseInt(thumbnailMeta[0].meta_value);
            const [imageData] = await db.query(`
                SELECT 
                    p.ID as id,
                    p.guid as url,
                    p.post_title as title
                FROM el1posts p
                WHERE p.ID = ? AND p.post_type = 'attachment'
            `, [thumbnailId]);

            if (imageData.length > 0) {
                featuredImage = {
                    id: imageData[0].id,
                    url: fixImageUrl(imageData[0].url),
                    title: imageData[0].title
                };
            }
        }

        // Get gallery images
        const [galleryMeta] = await db.query(`
            SELECT meta_value 
            FROM el1postmeta 
            WHERE post_id = ? AND meta_key = '_product_image_gallery'
        `, [productId]);

        let galleryImages = [];
        if (galleryMeta.length > 0 && galleryMeta[0].meta_value) {
            const galleryIds = galleryMeta[0].meta_value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

            if (galleryIds.length > 0) {
                const placeholders = galleryIds.map(() => '?').join(',');
                const [images] = await db.query(`
                    SELECT 
                        p.ID as id,
                        p.guid as url,
                        p.post_title as title
                    FROM el1posts p
                    WHERE p.ID IN (${placeholders}) AND p.post_type = 'attachment'
                `, galleryIds);

                galleryImages = images.map(img => ({
                    id: img.id,
                    url: fixImageUrl(img.url),
                    title: img.title
                }));
            }
        }

        // Get pricing
        const [priceMeta] = await db.query(`
            SELECT meta_key, meta_value 
            FROM el1postmeta 
            WHERE post_id = ? AND meta_key IN ('_regular_price', '_sale_price', '_price')
        `, [productId]);

        const pricing = {};
        priceMeta.forEach(meta => {
            pricing[meta.meta_key.replace('_', '')] = parseFloat(meta.meta_value) || null;
        });

        res.json({
            ...product,
            featured_image: featuredImage,
            gallery_images: galleryImages,
            pricing
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania produktu.' });
    }
});

/**
 * GET /products/:id/images
 * Returns all images for a product
 */
router.get('/products/:id/images', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);

        if (!productId || isNaN(productId)) {
            return res.status(400).json({ message: 'Nieprawidłowe ID produktu.' });
        }

        // Get thumbnail ID and gallery IDs
        const [thumbnailMeta] = await db.query(`
            SELECT meta_value FROM el1postmeta WHERE post_id = ? AND meta_key = '_thumbnail_id'
        `, [productId]);

        const [galleryMeta] = await db.query(`
            SELECT meta_value FROM el1postmeta WHERE post_id = ? AND meta_key = '_product_image_gallery'
        `, [productId]);

        // Collect all image IDs
        const imageIds = [];
        if (thumbnailMeta.length > 0 && thumbnailMeta[0].meta_value) {
            imageIds.push(parseInt(thumbnailMeta[0].meta_value));
        }
        if (galleryMeta.length > 0 && galleryMeta[0].meta_value) {
            const galleryIds = galleryMeta[0].meta_value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            imageIds.push(...galleryIds);
        }

        if (imageIds.length === 0) {
            return res.json({
                featured_image: null,
                gallery_images: [],
                all_images: []
            });
        }

        const uniqueImageIds = [...new Set(imageIds)];
        const placeholders = uniqueImageIds.map(() => '?').join(',');

        const [images] = await db.query(`
            SELECT 
                p.ID as id,
                p.guid as url,
                p.post_title as title,
                p.post_mime_type as mime_type
            FROM el1posts p
            WHERE p.ID IN (${placeholders}) AND p.post_type = 'attachment'
        `, uniqueImageIds);

        const fixedImages = images.map(img => ({
            ...img,
            url: fixImageUrl(img.url)
        }));
        const imageMap = {};
        fixedImages.forEach(img => { imageMap[img.id] = img; });

        const featuredId = thumbnailMeta.length > 0 ? parseInt(thumbnailMeta[0].meta_value) : null;
        const featuredImage = featuredId && imageMap[featuredId] ? imageMap[featuredId] : null;

        const galleryIds = galleryMeta.length > 0 && galleryMeta[0].meta_value
            ? galleryMeta[0].meta_value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
            : [];
        const galleryImages = galleryIds.map(id => imageMap[id]).filter(Boolean);

        res.json({
            featured_image: featuredImage,
            gallery_images: galleryImages,
            all_images: fixedImages
        });

    } catch (error) {
        console.error('Get product images error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania zdjęć produktu.' });
    }
});

/**
 * GET /image-proxy
 * Proxies images from WordPress to avoid CORS issues
 * SECURITY: Only allows whitelisted domains
 */
router.get('/image-proxy', async (req, res) => {
    try {
        const imageUrl = req.query.url;

        if (!imageUrl) {
            return res.status(400).json({ message: 'URL parameter is required' });
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(imageUrl);
        } catch {
            return res.status(400).json({ message: 'Invalid URL' });
        }

        // SECURITY: Block private/internal addresses
        if (isPrivateOrInternalHost(parsedUrl.hostname)) {
            console.warn(`[SECURITY] Blocked image proxy request to internal address: ${parsedUrl.hostname}`);
            return res.status(403).json({ message: 'Access to internal addresses is not allowed' });
        }

        // SECURITY: Only allow whitelisted domains
        if (!isAllowedImageDomain(parsedUrl.hostname)) {
            console.warn(`[SECURITY] Blocked image proxy request to non-whitelisted domain: ${parsedUrl.hostname}`);
            return res.status(403).json({ message: 'Domain not allowed' });
        }

        const client = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': `${parsedUrl.protocol}//${parsedUrl.hostname}/`,
            },
        };

        const proxyRequest = client.request(options, (proxyResponse) => {
            if (proxyResponse.statusCode >= 300 && proxyResponse.statusCode < 400 && proxyResponse.headers.location) {
                const redirectUrl = proxyResponse.headers.location;
                res.redirect(`/api/image-proxy?url=${encodeURIComponent(redirectUrl)}`);
                return;
            }

            if (proxyResponse.statusCode !== 200) {
                res.status(proxyResponse.statusCode).json({ message: 'Failed to fetch image' });
                return;
            }

            const contentType = proxyResponse.headers['content-type'] || 'image/jpeg';
            res.set('Content-Type', contentType);
            res.set('Cache-Control', 'public, max-age=86400');
            res.set('Access-Control-Allow-Origin', '*');

            proxyResponse.pipe(res);
        });

        proxyRequest.on('error', (error) => {
            console.error('Image proxy request error:', error);
            res.status(500).json({ message: 'Error fetching image' });
        });

        proxyRequest.end();

    } catch (error) {
        console.error('Image proxy error:', error);
        res.status(500).json({ message: 'Error proxying image' });
    }
});

/**
 * GET /debug/images/:productId
 * Debug endpoint for image data (development only)
 */
router.get('/debug/images/:productId', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ message: 'Not found' });
    }

    try {
        const productId = parseInt(req.params.productId);

        const [siteUrlResult] = await db.query(
            "SELECT option_value FROM el1options WHERE option_name = 'siteurl' LIMIT 1"
        );
        const [homeUrlResult] = await db.query(
            "SELECT option_value FROM el1options WHERE option_name = 'home' LIMIT 1"
        );

        const [thumbnailMeta] = await db.query(
            "SELECT meta_value FROM el1postmeta WHERE post_id = ? AND meta_key = '_thumbnail_id'",
            [productId]
        );

        let imageData = null;
        let attachmentMeta = null;

        if (thumbnailMeta.length > 0 && thumbnailMeta[0].meta_value) {
            const thumbnailId = parseInt(thumbnailMeta[0].meta_value);

            const [attachment] = await db.query(
                "SELECT ID, guid, post_title, post_mime_type FROM el1posts WHERE ID = ?",
                [thumbnailId]
            );

            const [meta] = await db.query(
                "SELECT meta_key, meta_value FROM el1postmeta WHERE post_id = ? AND meta_key IN ('_wp_attached_file', '_wp_attachment_metadata')",
                [thumbnailId]
            );

            imageData = attachment[0] || null;
            attachmentMeta = meta;
        }

        res.json({
            product_id: productId,
            wordpress_config: {
                siteurl: siteUrlResult[0]?.option_value || 'NOT FOUND',
                home: homeUrlResult[0]?.option_value || 'NOT FOUND'
            },
            thumbnail_id: thumbnailMeta[0]?.meta_value || null,
            image_data: imageData,
            attachment_meta: attachmentMeta
        });
    } catch (error) {
        console.error('Debug images error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

let r2Client = null;

function initR2Client() {
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
        console.warn('[R2] R2 credentials not configured, image upload will not work');
        return null;
    }

    r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });

    return r2Client;
}

function getR2Client() {
    if (!r2Client) {
        return initR2Client();
    }
    return r2Client;
}

async function uploadImage(file) {
    const client = getR2Client();
    if (!client) {
        throw new Error('R2_NOT_CONFIGURED');
    }

    if (!file) {
        throw new Error('NO_FILE');
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `blog-images/${uniqueSuffix}${ext}`;

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: filename,
        Body: file.buffer,
        ContentType: file.mimetype,
    });

    await client.send(command);

    const imageUrl = `${process.env.R2_PUBLIC_DOMAIN}/${filename}`;
    console.log(`[R2 UPLOAD] Success: ${imageUrl}`);

    return {
        url: imageUrl,
        filename
    };
}

module.exports = {
    initR2Client,
    getR2Client,
    uploadImage
};

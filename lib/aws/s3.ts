import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'gallardo-bucket';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Construct the public URL for accessing S3 objects
function getPublicUrl(key: string): string {
  // Use the standard S3 URL format
  return `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

export async function uploadToS3(
  buffer: Buffer,
  fileName: string,
  contentType: string = 'image/png',
  folder: string = 'selfies'
): Promise<{ url: string; key: string }> {
  const key = `${folder}/${Date.now()}-${fileName}`;

  console.log('Uploading to S3:', { bucket: BUCKET_NAME, key, region: AWS_REGION });

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Public access is handled by bucket policy instead of ACL
    })
  );

  const url = getPublicUrl(key);
  console.log('S3 upload successful. Public URL:', url);

  return { url, key };
}

export async function uploadImageToS3(
  buffer: Buffer,
  fileName: string,
  folder: string = 'selfies'
): Promise<{ url: string; key: string }> {
  // Detect content type from file extension
  const contentType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return uploadToS3(buffer, fileName, contentType, folder);
}

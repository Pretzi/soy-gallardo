# Setup Guide - Soy Gallardo

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `OPENAI_API_KEY` - Your OpenAI API key
- `AWS_REGION` - AWS region (e.g., us-east-1)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `DYNAMO_TABLE_NAME` - DynamoDB table name (default: PRETZI_ENTRIES)
- `S3_BUCKET_NAME` - S3 bucket name for selfies

### 3. Create AWS Resources

#### DynamoDB Table

Using AWS Console:
1. Go to DynamoDB Console
2. Create table with name `PRETZI_ENTRIES`
3. Partition key: `PK` (String)
4. Sort key: `SK` (String)
5. Add two Global Secondary Indexes:
   - GSI1: Partition key `GSI1PK`, Sort key `SK`
   - GSI2: Partition key `GSI2PK`, Sort key `SK`

Or use AWS CLI:

```bash
aws dynamodb create-table \
  --table-name PRETZI_ENTRIES \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI2PK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    "[{\"IndexName\":\"GSI1\",\"KeySchema\":[{\"AttributeName\":\"GSI1PK\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"SK\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}},{\"IndexName\":\"GSI2\",\"KeySchema\":[{\"AttributeName\":\"GSI2PK\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"SK\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]"
```

#### S3 Bucket

```bash
aws s3 mb s3://pretzi-entries-selfies
```

Optional - make bucket publicly readable:

```bash
aws s3api put-bucket-acl --bucket pretzi-entries-selfies --acl public-read
```

Or configure CORS and bucket policy as needed.

### 4. Prepare CSV Files

Place your CSV files in the `data/` folder:
- `entries-1.csv`
- `entries-2.csv`
- `colonia-comunidad.csv`
- `secciones.csv`

Sample files are already included for testing.

### 5. Seed Database

Import CSV data into DynamoDB:

```bash
npm run seed
```

This will read the CSV files and populate DynamoDB with entries.

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing the Application

### Test Flow

1. **Create Entry**: Go to `/entries/new`
   - Upload INE image (or skip)
   - Fill form
   - Upload selfie
   - Submit

2. **View Entries**: Go to `/entries`
   - Browse all entries
   - Use search bar

3. **Search**: Enter folio or name in search
   - Search by exact folio: `FOL001`
   - Search by name: `Juan` or `Pérez`

4. **View Details**: Click on entry
   - See all fields
   - Download PDF
   - Edit entry

### API Testing

```bash
# List entries
curl http://localhost:3000/api/entries

# Search
curl "http://localhost:3000/api/search?q=Juan"

# Get localidades
curl http://localhost:3000/api/options/localidades

# Get secciones
curl http://localhost:3000/api/options/secciones
```

## Common Issues

### Node Version Error

This project requires Node.js 20.9.0+. Check your version:

```bash
node --version
```

Update Node if needed using nvm:

```bash
nvm install 20
nvm use 20
```

### AWS Credentials Error

Make sure your `.env.local` file has correct AWS credentials. Test with:

```bash
aws sts get-caller-identity
```

### CSV Not Found

Ensure the `data/` folder exists with CSV files. The app will error if files are missing.

### Background Removal Fails

If selfie background removal fails, the app will use the original image. This is a fallback behavior and not an error.

## Production Deployment

### Vercel

1. Connect your GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

### Other Platforms

Build the app:

```bash
npm run build
npm start
```

## Next Steps

- Customize CSV column mappings in `lib/csv.ts` if your CSVs have different headers
- Adjust DynamoDB table name and S3 bucket name in `.env.local`
- Customize the PDF template in `lib/pdf.ts`
- Add authentication if needed
- Configure CloudFront for S3 in production

## Support

For issues, check:
- Environment variables are set correctly
- AWS resources are created
- CSV files are in the right format
- Dependencies are installed

Refer to `README.md` for detailed documentation.

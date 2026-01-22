# Quick Start Guide 🚀

## 1. Environment Setup (5 minutes)

Create `.env.local` file in project root:

```env
OPENAI_API_KEY=your-key-here
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
DYNAMO_TABLE_NAME=PRETZI_ENTRIES
S3_BUCKET_NAME=pretzi-entries-selfies
S3_PUBLIC_BASE_URL=https://pretzi-entries-selfies.s3.amazonaws.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 2. Create AWS Resources

### DynamoDB Table

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

### S3 Bucket

```bash
aws s3 mb s3://pretzi-entries-selfies
aws s3api put-public-access-block \
  --bucket pretzi-entries-selfies \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

## 3. Install & Seed

```bash
npm install
npm run seed
npm run dev
```

## 4. Access Application

Open http://localhost:3000

## File Structure

```
✅ /lib/aws/dynamo.ts      - DynamoDB operations
✅ /lib/aws/s3.ts           - S3 uploads
✅ /lib/openai.ts           - INE parsing with OpenAI
✅ /lib/pdf.ts              - PDF generation
✅ /lib/csv.ts              - CSV reading
✅ /lib/validation.ts       - Zod schemas

✅ /app/api/entries/        - CRUD endpoints
✅ /app/api/ine/parse/      - INE image parsing
✅ /app/api/selfie/upload/  - Selfie with bg removal
✅ /app/api/search/         - Search by folio/name
✅ /app/api/options/        - Dropdowns data

✅ /app/entries/            - List page
✅ /app/entries/new/        - Create entry (3-step flow)
✅ /app/entries/[id]/       - Detail page
✅ /app/entries/[id]/edit/  - Edit page

✅ /scripts/seed-dynamo.ts  - CSV import script
✅ /data/*.csv              - Sample data files
```

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ine/parse` | Parse INE image with OpenAI |
| POST | `/api/selfie/upload` | Upload selfie + remove background |
| GET | `/api/options/localidades` | Get localidades list |
| GET | `/api/options/secciones` | Get secciones list |
| POST | `/api/entries` | Create new entry |
| GET | `/api/entries` | List entries (paginated) |
| GET | `/api/entries/[id]` | Get single entry |
| PUT | `/api/entries/[id]` | Update entry |
| GET | `/api/entries/[id]/pdf` | Download PDF |
| GET | `/api/search?q=query` | Search by folio or name |

## User Flow

1. **Upload INE** → OpenAI extracts data → prefills form
2. **Edit Form** → Complete/correct fields with dropdowns
3. **Upload Selfie** → Background removed → Preview shown
4. **Submit** → Saved to DynamoDB + S3 → Redirect to detail

## Key Features Implemented

✅ INE image parsing with OpenAI GPT-4o Vision  
✅ Selfie on white background (preserves original face)  
✅ Form with dynamic dropdowns (localidades, secciones)  
✅ DynamoDB storage with GSI for search  
✅ S3 image storage  
✅ PDF generation with embedded selfie  
✅ Search by folio (exact) or name (fuzzy)  
✅ Full CRUD operations  
✅ CSV import script  
✅ Responsive Tailwind UI  
✅ TypeScript throughout  
✅ Zod validation  
✅ Error handling & loading states  

## Testing Checklist

- [ ] Upload INE image - data extracted correctly
- [ ] Manual form entry - dropdowns work
- [ ] Selfie upload - background removed
- [ ] Create entry - saved to DynamoDB
- [ ] List entries - displays correctly
- [ ] Search by folio - exact match works
- [ ] Search by name - partial match works
- [ ] View entry detail - all fields shown
- [ ] Edit entry - updates saved
- [ ] Download PDF - includes selfie & data

## Troubleshooting

**"Module not found"** → Run `npm install`  
**"AWS credentials error"** → Check `.env.local`  
**"Table not found"** → Create DynamoDB table  
**"CSV not found"** → Ensure `data/` folder has CSV files  
**Background removal fails** → App uses original image (fallback)

## Next Steps

- Replace sample CSV files with real data
- Test with actual INE images
- Customize PDF template if needed
- Deploy to production (Vercel recommended)
- Configure CloudFront for S3 in production

---

**Need help?** See `README.md` for full documentation or `SETUP.md` for detailed setup guide.

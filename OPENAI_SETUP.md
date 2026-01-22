# OpenAI Setup Guide

This application uses **OpenAI Vision API (GPT-4o)** for parsing INE images.

## What OpenAI is Used For

✅ **INE Image Parsing** - Extract structured data from Mexican ID cards
- Folio number
- Name (nombre, segundo nombre, apellidos)
- Date of birth
- Electoral section
- Locality

❌ **NOT Used For**:
- Selfie background removal (handled by simple image processing)
- DALL-E (not needed - we use basic white background)
- OpenAI Assistants API (not required)

## How to Get Your OpenAI API Key

### 1. Sign Up / Log In
Go to [OpenAI Platform](https://platform.openai.com/)

### 2. Navigate to API Keys
Visit [API Keys Page](https://platform.openai.com/api-keys)

### 3. Create New Secret Key
- Click "Create new secret key"
- Give it a name (e.g., "Soy Gallardo INE Parser")
- Copy the key (starts with `sk-`)
- **Save it immediately** - you won't be able to see it again!

### 4. Add to Environment File
Create `.env.local` in your project root:

```env
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

## API Model Used

**GPT-4o** (for INE parsing only)
```typescript
model: 'gpt-4o'
```
This model can analyze images and extract text/structured data from INE cards.

## Pricing

**GPT-4o Pricing** (as of 2026):
- Input: ~$2.50 per 1M tokens
- Output: ~$10 per 1M tokens
- Images: ~$0.001 - $0.01 per image

**Estimated Cost per INE Parse**: $0.01 - $0.02

**Selfie Processing**: FREE (local image processing, no API calls)

**Total per Entry**: ~$0.01 - $0.02
**For 1000 entries**: ~$10-20/month

See current pricing: https://openai.com/api/pricing/

## Testing Your API Key

Test if your key works:

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY"
```

You should see a list of available models.

## Environment Variables Required

Only ONE OpenAI variable is needed:

```env
OPENAI_API_KEY=sk-your-key-here
```

❌ You do NOT need:
- `OPENAI_ASSISTANT_ID` (not used)
- `OPENAI_ORG_ID` (optional)
- Any other OpenAI credentials

## What Happens in the App

When a user uploads an INE image:

1. Image sent to `/api/ine/parse` endpoint
2. Backend converts image to base64
3. Sends to OpenAI Vision API with structured prompt
4. OpenAI extracts:
   - Folio
   - Nombre, Segundo Nombre, Apellidos
   - Fecha de Nacimiento
   - Sección Electoral
   - Localidad
5. Returns JSON to frontend
6. Form is pre-filled with extracted data

## Troubleshooting

### "Invalid API key"
- Check you copied the full key including `sk-` prefix
- Ensure no extra spaces or line breaks
- Verify key is active in OpenAI dashboard

### "Model not found" or "Model access denied"
- Your account needs access to GPT-4o
- May require paid account or waitlist approval
- Try using `gpt-4-vision-preview` as fallback

### "Rate limit exceeded"
- You've hit your usage limit
- Upgrade your OpenAI plan
- Or wait for rate limit to reset

### "Insufficient credits"
- Add payment method to OpenAI account
- Purchase credits or set up auto-recharge
- Free tier is very limited

### API calls fail
- Check your `.env.local` file exists
- Restart Next.js dev server after adding env vars
- Check OpenAI status page: https://status.openai.com/

## Best Practices

1. ✅ **Monitor Usage**: Check OpenAI dashboard regularly
2. ✅ **Set Limits**: Configure spending limits in OpenAI settings
3. ✅ **Error Handling**: App already includes fallback if parsing fails
4. ✅ **Security**: Never commit `.env.local` to git
5. ✅ **Development vs Production**: Use separate keys

## Alternative Models

If you want to use a different model, edit `/lib/openai.ts`:

```typescript
// Current (GPT-4o)
model: 'gpt-4o',

// Alternatives:
model: 'gpt-4-vision-preview',  // Older GPT-4 Vision
model: 'gpt-4-turbo',            // GPT-4 Turbo with vision
```

## Code Location

INE parsing implementation: `/lib/openai.ts`

```typescript
export async function parseINEImage(imageBuffer: Buffer): Promise<INEParseResponse>
```

API endpoint: `/app/api/ine/parse/route.ts`

## Support

- OpenAI Documentation: https://platform.openai.com/docs
- OpenAI Help: https://help.openai.com/
- API Status: https://status.openai.com/

---

**That's it!** You only need one API key from OpenAI for INE parsing. No assistants, no background removal APIs needed.

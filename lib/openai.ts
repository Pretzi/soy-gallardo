import OpenAI from 'openai';
import type { INEParseResponse } from './validation';
import sharp from 'sharp';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function parseINEImage(imageBuffer: Buffer): Promise<INEParseResponse> {
  try {
    const base64Image = imageBuffer.toString('base64');
    const mimeType = 'image/jpeg'; // Assume JPEG, could be detected

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiza esta imagen de una credencial de elector (INE) mexicana y extrae los siguientes campos en formato JSON:
              
              - folio: El número de folio de la credencial
              - nombre: El nombre(s) de la persona
              - segundoNombre: Si hay un segundo nombre, separarlo aquí (opcional)
              - apellidos: Los apellidos completos (paterno y materno)
              - fechaNacimiento: Fecha de nacimiento en formato YYYY-MM-DD
              - seccionElectoral: El número de sección electoral
              - localidad: La localidad o municipio
              
              Devuelve solo el JSON, sin texto adicional. Si algún campo no es visible o no está claro, omítelo.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    
    const parsed = JSON.parse(jsonStr);
    
    return parsed as INEParseResponse;
  } catch (error) {
    console.error('Error parsing INE with OpenAI:', error);
    throw new Error('No se pudo analizar la credencial INE. Por favor, intenta de nuevo o llena el formulario manualmente.');
  }
}

// Process image: Use OpenAI Vision + DALL-E Generation to create ID photo with white background
export async function processImageOnWhiteBackground(imageBuffer: Buffer): Promise<Buffer> {
  console.log('🎨 Starting OpenAI DALL-E generation for ID photo...');
  
  try {
    // First, resize to square for consistent processing
    console.log('📐 Resizing image to 1024x1024 square...');
    const squareImage = await sharp(imageBuffer)
      .resize(1024, 1024, { 
        fit: 'cover',
        position: 'attention'
      })
      .jpeg({ quality: 95 })
      .toBuffer();

    console.log(`✅ Image prepared: ${squareImage.length} bytes`);

    // Convert to base64 for GPT-4 Vision analysis
    const base64Image = squareImage.toString('base64');
    
    console.log('👁️ Using GPT-4 Vision to analyze the person...');
    
    // First, analyze the image to get a DETAILED description of the person
    const visionResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this person\'s face in EXTREME detail to recreate their exact appearance: Age, gender, face shape (oval/round/square), eye color, eye shape, eyebrow thickness and shape, nose shape and size, lip fullness, mouth width, skin tone (specific shade), hair color and exact style, facial hair (if any), distinctive marks, jawline, cheekbones, forehead, any glasses or accessories. Be VERY specific about every facial feature.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 300
    });

    const personDescription = visionResponse.choices[0]?.message?.content || 'person';
    console.log(`✅ Person analyzed: ${personDescription}`);

    console.log('🤖 Generating photo with white background using DALL-E...');
    
    // Generate a photo with white background, preserving all facial details
    const dallePrompt = `A front-facing portrait photograph of ${personDescription}. Pure solid white background. Capture EVERY facial detail precisely: exact eye shape, nose structure, mouth, facial proportions, bone structure, distinctive features. The face must match the description EXACTLY. Professional studio lighting on white backdrop. High quality, sharp, detailed, realistic.`;
    
    console.log(`📝 DALL-E Prompt: ${dallePrompt}`);

    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: dallePrompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
      style: "natural"
    });

    console.log('✅ DALL-E generation complete');

    if (!imageResponse.data || imageResponse.data.length === 0) {
      throw new Error('No se recibió imagen generada de DALL-E');
    }

    const generatedImageUrl = imageResponse.data[0]?.url;
    if (!generatedImageUrl) {
      throw new Error('No se recibió URL de imagen generada de DALL-E');
    }

    console.log(`📥 Downloading generated image from: ${generatedImageUrl}`);

    // Download the generated image
    const downloadResponse = await fetch(generatedImageUrl);
    const generatedImageBuffer = Buffer.from(await downloadResponse.arrayBuffer());

    console.log(`✅ Downloaded: ${generatedImageBuffer.length} bytes`);

    // Convert to JPEG with high quality
    const finalImage = await sharp(generatedImageBuffer)
      .resize(1024, 1024, { fit: 'cover' })
      .jpeg({ quality: 95 })
      .toBuffer();

    console.log(`🎉 DALL-E ID photo generation complete! Final size: ${finalImage.length} bytes`);

    return finalImage;
  } catch (error: any) {
    console.error('❌ Error generating image with DALL-E:', error);
    console.log('Error details:', error.message);
    if (error.response?.data) {
      console.log('API response error:', JSON.stringify(error.response.data));
    }
    
    // Fallback to simple white background if OpenAI fails
    console.log('⚠️ Falling back to simple white background processing...');
    const fallbackImage = await sharp(imageBuffer)
      .resize(1024, 1024, { 
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 90 })
      .toBuffer();
    
    console.log(`✅ Fallback image created: ${fallbackImage.length} bytes`);
    return fallbackImage;
  }
}

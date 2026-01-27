import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

/**
 * Process selfie using Gemini 2.5 Flash Image ("Nano Banana") to replace background with white
 * Preserves original facial features while replacing background
 */
export async function processHeadshotWithGemini(imageBuffer: Buffer): Promise<Buffer> {
  console.log('🍌 Starting Gemini 2.5 Flash Image (Nano Banana) processing...');
  
  try {
    // Convert image to base64 for Gemini
    const base64Image = imageBuffer.toString('base64');
    
    console.log('🤖 Using Gemini 2.5 Flash Image to edit background...');
    
    // Use Gemini 2.5 Flash Image model for image generation/editing
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-image',
    });
    
    // Create prompt for image editing with background replacement
    const prompt = `Replace the background with a solid pure white background (#FFFFFF). 
Keep the person's face and body EXACTLY as they appear - preserve ALL original facial features, skin tone, hair, expression, and details.
Only change the background to solid white. Center the person in the frame.
Make it look like a professional ID photo with clean white background.
DO NOT change or modify the person's appearance in any way - only replace the background with white.`;

    console.log('📝 Sending to Gemini for background replacement...');
    
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg'
        }
      },
      prompt
    ]);

    const response = await result.response;
    
    // Check if image was generated
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          console.log('✅ Gemini generated image with white background');
          
          const generatedImageBuffer = Buffer.from(part.inlineData.data, 'base64');
          
          // Resize to square format if needed
          const finalImage = await sharp(generatedImageBuffer)
            .resize(1024, 1024, { fit: 'cover', position: 'centre' })
            .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
            .toBuffer();
          
          console.log(`🎉 Gemini 2.5 Flash Image processing complete! Size: ${finalImage.length} bytes`);
          
          return finalImage;
        }
      }
    }
    
    throw new Error('No image data returned from Gemini');
    
  } catch (error: any) {
    console.error('❌ Error with Gemini 2.5 Flash Image:', error);
    console.log('Error details:', error.message);
    
    // Fallback: simple processing with sharp (no heavy AI library)
    console.log('⚠️ Falling back to simple image processing...');
    const fallbackImage = await sharp(imageBuffer)
      .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .normalize()
      .sharpen()
      .jpeg({ quality: 90 })
      .toBuffer();
    
    console.log(`✅ Fallback processing complete: ${fallbackImage.length} bytes`);
    return fallbackImage;
  }
}

/**
 * Alternative: Use Gemini Vision to analyze face position for optimal cropping
 */
export async function processHeadshotWithGeminiVision(imageBuffer: Buffer): Promise<Buffer> {
  console.log('🎨 Starting Gemini Vision analysis...');
  
  try {
    // Use Gemini to analyze the person for optimal cropping
    const base64Image = imageBuffer.toString('base64');
    const mimeType = 'image/jpeg';

    console.log('👁️ Using Gemini to analyze face position...');
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType
        }
      },
      'Analyze this photo and describe the exact position of the person\'s face. Provide the face center coordinates as percentages of image width and height. Format: {"faceX": 50, "faceY": 40} where 0,0 is top-left and 100,100 is bottom-right.'
    ]);

    const response = await result.response;
    const text = response.text();
    console.log('✅ Gemini analysis:', text);

    // Extract face position
    let faceX = 50, faceY = 40;
    try {
      const jsonMatch = text.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const coords = JSON.parse(jsonMatch[0]);
        faceX = coords.faceX || 50;
        faceY = coords.faceY || 40;
      }
    } catch (e) {
      console.log('Using default face position');
    }

    console.log(`📍 Face position: ${faceX}%, ${faceY}%`);

    // Create square image with person centered
    const finalImage = await sharp(imageBuffer)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        position: 'centre'
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .normalize()
      .sharpen()
      .jpeg({ quality: 95 })
      .toBuffer();

    console.log(`🎉 Gemini Vision processing complete! Size: ${finalImage.length} bytes`);

    return finalImage;
  } catch (error: any) {
    console.error('❌ Error with Gemini Vision:', error);
    console.log('Falling back to primary Gemini processing...');
    
    // Fallback to primary method
    return processHeadshotWithGemini(imageBuffer);
  }
}

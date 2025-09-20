import { GoogleGenAI, Modality } from "@google/genai";
import type { EditingParams, ImageData } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fileToBase64 = (file: File): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve({ base64, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
  });
};

const parseAspectRatio = (aspectRatioString: string): [number, number] => {
    const [ratioPart] = aspectRatioString.split(' ');
    const [width, height] = ratioPart.split(':').map(Number);
    return [width, height];
};

export const formatImageWithAspectRatio = (
    imageData: ImageData,
    aspectRatioString: string
): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
        const [targetW, targetH] = parseAspectRatio(aspectRatioString);
        const image = new Image();
        image.src = `data:${imageData.mimeType};base64,${imageData.base64}`;

        image.onload = () => {
            const originalWidth = image.width;
            const originalHeight = image.height;

            const MAX_DIMENSION = 1024;
            let canvasWidth: number;
            let canvasHeight: number;

            if (targetW >= targetH) {
                canvasWidth = MAX_DIMENSION;
                canvasHeight = (MAX_DIMENSION * targetH) / targetW;
            } else {
                canvasHeight = MAX_DIMENSION;
                canvasWidth = (MAX_DIMENSION * targetW) / targetH;
            }

            const canvas = document.createElement('canvas');
            canvas.width = Math.round(canvasWidth);
            canvas.height = Math.round(canvasHeight);

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas 2D context'));
            }

            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const scale = Math.min(canvas.width / originalWidth, canvas.height / originalHeight);
            const scaledWidth = originalWidth * scale;
            const scaledHeight = originalHeight * scale;
            const x = (canvas.width - scaledWidth) / 2;
            const y = (canvas.height - scaledHeight) / 2;

            ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

            const resultDataUrl = canvas.toDataURL(imageData.mimeType);
            const newBase64 = resultDataUrl.split(',')[1];

            resolve({ base64: newBase64, mimeType: imageData.mimeType });
        };

        image.onerror = (error) => {
            console.error("Image loading error for formatting:", error);
            reject(new Error("Failed to load image for formatting."));
        };
    });
};


export const generatePrompt = async (params: EditingParams, styleImage: ImageData | null): Promise<string> => {
    const model = 'gemini-2.5-flash';

    const textPrompt = `Your task is to create a detailed, professional photographic prompt for an AI image generation model.
${styleImage ? "A style reference image is provided. First, analyze this image and create a detailed description of its artistic style. This description should cover elements like: lighting (e.g., soft, dramatic, natural), color palette (e.g., warm, cool, monochromatic, vibrant), mood (e.g., moody, cheerful, serene), texture (e.g., smooth, grainy, glossy), and composition (e.g., minimalist, centered, rule of thirds). " : ""}
Next, use this style description (if a style image was provided) and combine it with the following parameters to construct the final prompt:
- Aspect Ratio: ${params.aspectRatio}
- Lighting: ${params.lightingStyle}
- Camera Perspective: ${params.cameraPerspective}

The final output MUST be a single, cohesive prompt that describes the desired final image. Do not mention the reference image in the final prompt. The prompt should be a standalone instruction for an image generator. For example, instead of saying 'like the reference image', say 'with soft, warm lighting and a shallow depth of field'.

Produce ONLY the final, detailed prompt. No conversational text, no explanations, no markdown formatting.`;

    const contents = styleImage ? {
        parts: [
            { inlineData: { data: styleImage.base64, mimeType: styleImage.mimeType } },
            { text: textPrompt }
        ]
    } : textPrompt;

    try {
        const response = await ai.models.generateContent({
            model,
            contents,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating prompt:", error);
        throw new Error("Failed to generate prompt. Please check your API key and network connection.");
    }
};

export const editImage = async (
    productImage: ImageData, 
    styleImage: ImageData | null, 
    prompt: string
): Promise<string> => {
    const model = 'gemini-2.5-flash-image-preview';

    const parts = [
        { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } },
        { text: prompt }
    ];

    if (styleImage) {
        parts.push({ inlineData: { data: styleImage.base64, mimeType: styleImage.mimeType } });
    }

    try {
        const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image was generated in the response.");
    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Failed to generate the image. The model may have refused the request. Please try a different prompt or image.");
    }
};
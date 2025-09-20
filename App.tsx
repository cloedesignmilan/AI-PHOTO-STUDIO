import React, { useState, useEffect, useCallback } from 'react';
import ImageUploader from './components/ImageUploader';
import Spinner from './components/Spinner';
import Lightbox from './components/Lightbox';
import History from './components/History';
import { generatePrompt, editImage, formatImageWithAspectRatio } from './services/geminiService';
import { ASPECT_RATIOS, LIGHTING_STYLES, CAMERA_PERSPECTIVES } from './constants';
import type { EditingParams, ImageData, HistoryItem } from './types';

const ControlButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
      isActive ? 'bg-indigo-500 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }`}
  >
    {label}
  </button>
);

const App: React.FC = () => {
  const [productImage, setProductImage] = useState<ImageData | null>(null);
  const [styleImage, setStyleImage] = useState<ImageData | null>(null);
  const [editingParams, setEditingParams] = useState<EditingParams>({
    aspectRatio: ASPECT_RATIOS[0],
    lightingStyle: LIGHTING_STYLES[0],
    cameraPerspective: CAMERA_PERSPECTIVES[0],
  });
  const [prompt, setPrompt] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState<boolean>(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load history from localStorage on initial render
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('ai-photo-studio-history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Failed to parse history from localStorage", e);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ai-photo-studio-history', JSON.stringify(history));
  }, [history]);

  const handleParamChange = <K extends keyof EditingParams,>(param: K, value: EditingParams[K]) => {
    setEditingParams(prev => ({ ...prev, [param]: value }));
  };
  
  const triggerPromptGeneration = useCallback(async () => {
    if (!productImage) return; // Don't generate prompt without a base image
    
    setIsGeneratingPrompt(true);
    setError(null);
    try {
      const newPrompt = await generatePrompt(editingParams, styleImage);
      setPrompt(newPrompt);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsGeneratingPrompt(false);
    }
  }, [editingParams, styleImage, productImage]);

  useEffect(() => {
    const handler = setTimeout(() => {
        triggerPromptGeneration();
    }, 500); // Debounce prompt generation

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingParams, styleImage, productImage]); // Rerun when params or images change

  const handleGenerateImage = async () => {
    if (!productImage || !prompt) {
      setError("Please upload a product image and ensure a prompt is generated.");
      return;
    }
    setIsGeneratingImage(true);
    setGeneratedImage(null);
    setError(null);
    try {
      const formattedProductImage = await formatImageWithAspectRatio(productImage, editingParams.aspectRatio);
      const resultImage = await editImage(formattedProductImage, styleImage, prompt);
      
      setGeneratedImage(resultImage);

      const newHistoryItem: HistoryItem = {
        id: new Date().toISOString(),
        imageUrl: resultImage,
        prompt: prompt,
        params: editingParams
      };
      setHistory(prevHistory => [newHistoryItem, ...prevHistory]);

    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsGeneratingImage(false);
    }
  };
  
  const handleSelectHistoryItem = (item: HistoryItem) => {
    setGeneratedImage(item.imageUrl);
    setPrompt(item.prompt);
    setEditingParams(item.params);
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 lg:p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
            AI Photo Studio
          </span>
        </h1>
        <p className="mt-2 text-lg text-gray-400">Transform your product photos with Nano Banana</p>
      </header>
      
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative my-4 max-w-4xl mx-auto" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {/* Column 1: Inputs */}
        <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg flex flex-col gap-6">
            <ImageUploader id="product-image" label="1. Upload Product Photo" onImageUpload={setProductImage} />
            <ImageUploader id="style-image" label="2. (Optional) Upload Style Reference" onImageUpload={setStyleImage} />
        </div>
        
        {/* Column 2: Controls */}
        <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-200">3. Select Style</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2 text-gray-400">Aspect Ratio</h4>
                <div className="flex flex-wrap gap-2">
                  {ASPECT_RATIOS.map(r => <ControlButton key={r} label={r} isActive={editingParams.aspectRatio === r} onClick={() => handleParamChange('aspectRatio', r)} />)}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2 text-gray-400">Lighting Style</h4>
                <div className="flex flex-wrap gap-2">
                  {LIGHTING_STYLES.map(l => <ControlButton key={l} label={l} isActive={editingParams.lightingStyle === l} onClick={() => handleParamChange('lightingStyle', l)} />)}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2 text-gray-400">Camera Perspective</h4>
                <div className="flex flex-wrap gap-2">
                  {CAMERA_PERSPECTIVES.map(p => <ControlButton key={p} label={p} isActive={editingParams.cameraPerspective === p} onClick={() => handleParamChange('cameraPerspective', p)} />)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-grow flex flex-col">
            <h3 className="text-lg font-semibold mb-3 text-gray-200">4. AI-Generated Prompt</h3>
             <div className="relative flex-grow">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isGeneratingPrompt ? "Generating your creative prompt..." : "Your detailed prompt will appear here..."}
                className="w-full h-full min-h-[150px] bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 resize-none"
                disabled={isGeneratingPrompt}
              />
              {isGeneratingPrompt && <div className="absolute top-3 right-3"><Spinner className="w-5 h-5" /></div>}
            </div>
          </div>
          
           <button 
            onClick={handleGenerateImage}
            disabled={isGeneratingImage || !productImage || !prompt}
            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg text-lg"
          >
            {isGeneratingImage ? <><Spinner className="mr-3" /> Generating...</> : "Generate Image"}
          </button>
        </div>
        
        {/* Column 3: Output */}
        <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg flex flex-col justify-center items-center">
            <h3 className="text-lg font-semibold mb-3 text-gray-200 w-full text-left">5. Generated Image</h3>
            <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center aspect-square">
                {isGeneratingImage && <div className="text-center"><Spinner className="w-12 h-12 mx-auto" /><p className="mt-4 text-gray-400">AI is creating magic...</p></div>}
                {!isGeneratingImage && generatedImage && (
                  <img 
                    src={generatedImage} 
                    alt="Generated result" 
                    className="object-contain h-full w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxImage(generatedImage)} 
                  />
                )}
                {!isGeneratingImage && !generatedImage && <div className="text-center text-gray-500 p-4">Your final creation will appear here.</div>}
            </div>
        </div>
      </main>

      <section className="max-w-7xl mx-auto mt-8">
        <History
            history={history}
            onSelect={handleSelectHistoryItem}
            onClear={handleClearHistory}
        />
      </section>

      {lightboxImage && (
        <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  );
};

export default App;

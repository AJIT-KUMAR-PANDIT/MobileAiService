import { FC } from "react";

const Home: FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">WebLLM Assistant Demo</h1>
          <div className="flex space-x-4">
            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="h-32 bg-gray-200 rounded-lg mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="h-32 bg-gray-200 rounded-lg mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="h-32 bg-gray-200 rounded-lg mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">About WebLLM Assistant</h2>
          <p className="mb-3">
            This demo showcases a futuristic AI assistant that runs entirely in your browser using WebLLM technology.
          </p>
          <p className="mb-3">
            Click the AI button in the bottom right corner to interact with the assistant through voice or text.
          </p>
          <p>
            The AI model is downloaded and stored locally in your browser, ensuring privacy and offline functionality.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;

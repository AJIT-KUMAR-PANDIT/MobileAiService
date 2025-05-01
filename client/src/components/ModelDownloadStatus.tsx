import { FC } from "react";
import { motion } from "framer-motion";

interface ModelDownloadStatusProps {
  isDownloading: boolean;
  progress: number;
  downloadedSize: string;
  totalSize: string;
}

export const ModelDownloadStatus: FC<ModelDownloadStatusProps> = ({
  isDownloading,
  progress,
  downloadedSize,
  totalSize,
}) => {
  if (!isDownloading) return null;

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      style={{
        background: "rgba(17, 24, 39, 0.7)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="text-center p-6 rounded-xl max-w-sm"
        style={{
          background: "rgba(249, 250, 251, 0.25)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="text-white mb-4">
          <motion.svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-16 w-16 mx-auto text-accent mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </motion.svg>
          <h3 className="text-xl font-tech font-semibold mb-2">Downloading AI Model</h3>
          <p className="text-gray-300 text-sm mb-4">
            This will be stored locally in your browser for future use. No data is sent to external servers.
          </p>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-4 mb-3">
          <motion.div 
            className="bg-gradient-to-r from-primary to-accent h-4 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="text-white text-sm">
          <span>{Math.round(progress)}%</span> - <span>{downloadedSize}</span> of <span>{totalSize}</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

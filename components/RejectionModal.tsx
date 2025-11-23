import React, { useState } from 'react';
import { X, Sparkles, AlertTriangle } from 'lucide-react';
import { generateRejectionDraft } from '../services/geminiService';
import { Timesheet } from '../types';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  timesheet: Timesheet;
}

const RejectionModal: React.FC<RejectionModalProps> = ({ isOpen, onClose, onConfirm, timesheet }) => {
  const [reason, setReason] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleSmartPolish = async () => {
    if (!reason.trim()) return;
    setIsGenerating(true);
    const polished = await generateRejectionDraft(timesheet, reason);
    setReason(polished);
    setIsGenerating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
        <div className="p-6 border-b border-red-100 bg-red-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full text-red-600">
                <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-red-900">Reject Timesheet</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 mb-4 text-sm">
            Please provide a reason for rejecting <strong>{timesheet.employeeName}</strong>'s timesheet. This will be sent to the employee.
          </p>
          
          <div className="relative">
            <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none text-sm"
                placeholder="e.g. Incorrect hours entered for Friday..."
            />
            <button
                onClick={handleSmartPolish}
                disabled={isGenerating || !reason.trim()}
                className="absolute bottom-3 right-3 text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 bg-purple-50 px-2 py-1 rounded-md border border-purple-200 transition-colors disabled:opacity-50"
            >
                <Sparkles className="w-3 h-3" />
                {isGenerating ? 'Polishing...' : 'AI Polish'}
            </button>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectionModal;
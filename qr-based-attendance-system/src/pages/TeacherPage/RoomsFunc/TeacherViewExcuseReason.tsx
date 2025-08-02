import React from "react";

interface ViewExcuseReasonModalProps {
  open: boolean;
  onClose: () => void;
  studentName: string;
  reason: string | null;
  attachmentPath: string | null;
  apiUrl: string;
}

const TeacherViewExcuseReasonModal: React.FC<ViewExcuseReasonModalProps> = ({
  open,
  onClose,
  studentName,
  reason,
  attachmentPath,
  apiUrl,
}) => {
  if (!open) return null;

  const getAttachmentContent = () => {
    if (!attachmentPath) return null;
    const url = `${apiUrl.replace(/\/$/, "")}/${attachmentPath}`;
    if (attachmentPath.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return (
        <img
          src={url}
          alt="Excuse Attachment"
          className="w-full max-h-[500px] border rounded shadow-lg object-contain bg-gray-100"
          style={{ display: "block", margin: "0 auto" }}
        />
      );
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-2 px-4 py-2 bg-blue-100 text-blue-700 font-semibold rounded hover:bg-blue-200 transition"
      >
        <svg
          className="inline-block w-5 h-5 mr-2 align-text-bottom"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828L18 9.828M7 7h10M7 7v10"
          />
        </svg>
        View Attachment
      </a>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg relative animate-fade-in">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <svg
              className="w-8 h-8 text-blue-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-blue-700">Excuse Reason</h2>
        </div>
        <div className="mb-4">
          <span className="font-semibold text-gray-700">Student:</span>{" "}
          <span className="text-gray-900">{studentName}</span>
        </div>
        <div className="mb-6">
          <span className="font-semibold text-gray-700">Reason:</span>
          <div className="mt-2 p-4 border rounded-lg bg-gray-50 text-gray-800 min-h-[60px] shadow-inner">
            {reason ? (
              <span>{reason}</span>
            ) : (
              <span className="italic text-gray-400">No reason provided.</span>
            )}
          </div>
        </div>
        {attachmentPath && (
          <div className="mb-6">
            <span className="font-semibold text-gray-700">Attachment:</span>
            <div className="mt-3">{getAttachmentContent()}</div>
          </div>
        )}
        <button
          className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold w-full shadow transition"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <style>
        {`
          .animate-fade-in {
            animation: fadeIn 0.2s ease;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px);}
            to { opacity: 1; transform: translateY(0);}
          }
        `}
      </style>
    </div>
  );
};

export default TeacherViewExcuseReasonModal;

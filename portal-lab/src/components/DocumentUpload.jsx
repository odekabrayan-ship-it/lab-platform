import { useState } from "react";
import API from "../services/api";

export default function DocumentUpload({ onUploadSuccess, existingDocs = [] }) {
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("DEGREE");
  const [fileName, setFileName] = useState("");

  const handleSimulateUpload = async (e) => {
    e.preventDefault();
    if (!fileName) return;
    
    setUploading(true);
    try {
      // In a real app, we would use FormData and a file input
      // For MVP, we simulate by providing a name and a dummy URL
      const mockUrl = `https://storage.qualicore.com/docs/${Math.random().toString(36).substring(7)}_${fileName}`;
      
      await API.post("/api/professional/documents", {
        document_type: docType,
        file_url: mockUrl,
        file_name: fileName
      });
      
      onUploadSuccess();
      setFileName("");
    } catch (err) {
      alert("Upload failed: " + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'DEGREE': return '🎓';
      case 'LICENSE': return '📜';
      case 'ID': return '🆔';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel border-dashed border-2 border-white/10 p-8 text-center">
        <div className="text-4xl mb-4">📤</div>
        <h4 className="text-lg font-bold mb-2">Upload Required Documents</h4>
        <p className="text-sm text-muted mb-6">Attach your credentials for verification (Max 5MB per file)</p>
        
        <form onSubmit={handleSimulateUpload} className="max-w-md mx-auto space-y-4">
          <div className="flex gap-2">
            <select 
              className="flex-1 p-3 border rounded bg-soft text-sm"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              <option value="DEGREE">Degree Certificate</option>
              <option value="LICENSE">Professional License</option>
              <option value="ID">ID / Passport</option>
              <option value="OTHER">Other Certification</option>
            </select>
            <input 
              type="text" 
              placeholder="Document Name (e.g. BSc Biology.pdf)"
              className="flex-[2] p-3 border rounded bg-soft text-sm"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={uploading}
            className="btn-primary w-full py-3"
          >
            {uploading ? "Uploading..." : "Attach Document"}
          </button>
        </form>
      </div>

      {existingDocs.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Uploaded Documents ({existingDocs.length})</h5>
          {existingDocs.map(doc => (
            <div key={doc.id} className="glass-panel flex justify-between items-center py-3 px-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">{getIcon(doc.document_type)}</span>
                <div>
                  <div className="text-sm font-bold">{doc.file_name}</div>
                  <div className="text-[9px] text-muted uppercase font-bold">{doc.document_type}</div>
                </div>
              </div>
              <div className="text-green-400 text-xs font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                Ready
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

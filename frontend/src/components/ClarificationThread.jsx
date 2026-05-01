import { useState, useEffect } from "react";
import API from "../services/api";

export default function ClarificationThread({ requestId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchMessages = async () => {
    try {
      const res = await API.get(`/api/requests/${requestId}/clarifications`);
      setMessages(res.data.data);
    } catch (err) {
      console.error("Failed to load clarifications");
    }
  };

  useEffect(() => { fetchMessages(); }, [requestId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await API.post(`/api/requests/${requestId}/clarifications`, { message: newMessage });
      setNewMessage("");
      fetchMessages();
    } catch (err) {
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[400px]">
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 custom-scrollbar">
        {messages.length === 0 ? (
            <div className="text-center py-10 opacity-50 italic text-xs">
                No clarifications yet. Technical communication will be logged here.
            </div>
        ) : (
            messages.map(msg => (
                <div key={msg.id} className={`p-3 rounded-lg text-xs ${msg.sender_id === user.id ? 'bg-primary/10 ml-8 border border-primary/20' : 'bg-slate-100 mr-8 border border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold opacity-70 text-[10px] uppercase">
                            {msg.sender_role === 'lab' ? '🔬 Lab Technical Team' : '🏢 Client / Requester'}
                        </span>
                        <span className="text-[9px] opacity-50">{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                </div>
            ))
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-100 pt-3">
        <input 
            type="text" 
            className="flex-1 p-2 border rounded-md text-xs" 
            placeholder="Type technical clarification..." 
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            disabled={sending}
        />
        <button 
            type="submit" 
            className="btn-primary py-1 px-4 text-xs font-bold"
            disabled={sending}
        >
            {sending ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

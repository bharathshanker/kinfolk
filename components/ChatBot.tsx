import React, { useState, useRef, useEffect } from 'react';
import { Button, Icon, Card } from './Shared';
import { ChatMessage, Person } from '../types';
import { sendMessageToGemini } from '../services/geminiService';

interface ChatBotProps {
  people: Person[];
  isOpen: boolean;
  onClose: () => void;
  onAddTodo: (personId: string, title: string, date: string) => Promise<void>;
  onAddHealth: (personId: string, title: string, date: string, notes: string, type: string, files?: File[]) => Promise<void>;
  onAddNote: (personId: string, title: string, content: string) => Promise<void>;
  onAddFinance: (personId: string, title: string, amount: number, type: string, date: string) => Promise<void>;
}

export const ChatBot: React.FC<ChatBotProps> = ({
  people,
  isOpen,
  onClose,
  onAddTodo,
  onAddHealth,
  onAddNote,
  onAddFinance
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', role: 'model', text: 'Hi! I\'m Kinfolk. How can I help you support your loved ones today?' }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const response = await sendMessageToGemini(messages, input, people);

      // Handle Tool Calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          const { name, args } = toolCall;
          console.log('Executing tool:', name, args);

          // Find person by name (simple case-insensitive match)
          const person = people.find(p => p.name.toLowerCase().includes(args.person_name.toLowerCase()));

          if (!person) {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'model',
              text: `I couldn't find a person named "${args.person_name}". Please check the name.`
            }]);
            continue;
          }

          if (name === 'add_todo') {
            await onAddTodo(person.id, args.title, args.due_date);
          } else if (name === 'add_health_record') {
            await onAddHealth(person.id, args.title, args.date, args.notes || '', args.type || 'OTHER');
          } else if (name === 'add_note') {
            await onAddNote(person.id, args.title, args.content);
          } else if (name === 'add_finance_record') {
            await onAddFinance(person.id, args.title, args.amount, args.type, args.date);
          }
        }
      }

      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, something went wrong." }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

      {/* Sidebar/Panel */}
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col pointer-events-auto transform transition-transform animate-slide-in-right">
        {/* Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-cream">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-200 to-purple-200 flex items-center justify-center text-indigo-700">
              <Icon name="network_intelligence" className="text-xl" />
            </div>
            <div>
              <h3 className="font-bold text-stone-800">Kinfolk AI</h3>
              <p className="text-xs text-stone-500">Powered by Gemini 3 Pro</p>
            </div>
          </div>
          <Button variant="icon" onClick={onClose}>
            <Icon name="close" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                  ? 'bg-stone-800 text-white rounded-br-none'
                  : 'bg-white border border-stone-100 text-stone-700 shadow-sm rounded-bl-none'
                  }`}
              >
                {msg.text.split('\n').map((line, i) => <p key={i} className="mb-1 last:mb-0">{line}</p>)}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-white border border-stone-100 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce delay-100" />
                <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce delay-200" />
                <span className="text-xs text-stone-400 ml-1">Thinking deeply...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-stone-100">
          <div className="flex items-end gap-2 bg-stone-50 p-2 rounded-xl border border-stone-200 focus-within:ring-2 focus-within:ring-stone-200 focus-within:border-stone-400 transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your family..."
              className="w-full bg-transparent border-none focus:ring-0 resize-none text-stone-700 text-sm max-h-32 p-2 placeholder-stone-400 outline-none"
              rows={1}
              style={{ minHeight: '44px' }}
            />
            <Button
              variant="primary"
              className={`!p-2 h-10 w-10 shrink-0 ${!input.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleSend}
              disabled={!input.trim() || isThinking}
            >
              <Icon name="arrow_upward" className="text-lg" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { RecordType, RecordShare, Person } from '../types';
import { Icon, Button, Modal, Input } from './Shared';

interface ShareButtonProps {
    recordType: RecordType;
    recordId: string;
    personId: string;
    shares?: RecordShare[];
    collaborators: string[];
    onShare: (recordType: RecordType, recordId: string, email: string) => Promise<void>;
    onUnshare: (shareId: string) => Promise<void>;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
    recordType,
    recordId,
    personId,
    shares = [],
    collaborators,
    onShare,
    onUnshare
}) => {
    const [showModal, setShowModal] = useState(false);
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleShare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsLoading(true);
        try {
            await onShare(recordType, recordId, email.trim());
            setEmail('');
        } catch (error) {
            console.error('Failed to share:', error);
            alert('Failed to share. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnshare = async (shareId: string) => {
        setIsLoading(true);
        try {
            await onUnshare(shareId);
        } catch (error) {
            console.error('Failed to unshare:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const shareCount = shares.length;

    return (
        <>
            <button
                onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                className={`p-1.5 rounded-lg transition-colors ${shareCount > 0
                        ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                        : 'text-brown-400 hover:bg-brown-100 hover:text-brown-600'
                    }`}
                title={shareCount > 0 ? `Shared with ${shareCount}` : 'Share'}
            >
                <Icon name="share" className="text-lg" />
                {shareCount > 0 && (
                    <span className="ml-1 text-xs font-bold">{shareCount}</span>
                )}
            </button>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Share This Item"
            >
                <div className="space-y-4">
                    {/* Current Shares */}
                    {shares.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-brown-500 uppercase mb-2">Shared With</h4>
                            <div className="space-y-2">
                                {shares.map(share => (
                                    <div key={share.id} className="flex justify-between items-center p-3 bg-brown-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                {(share.sharedByName || share.sharedWithEmail || 'U')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-brown-700">
                                                    {share.sharedByName || share.sharedWithEmail}
                                                </p>
                                                <p className="text-xs text-brown-400">
                                                    {share.status === 'PENDING' ? '⏳ Pending' :
                                                        share.status === 'ACCEPTED' ? '✓ Accepted' :
                                                            '✕ Declined'}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleUnshare(share.id)}
                                            disabled={isLoading}
                                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add New Share */}
                    <div>
                        <h4 className="text-xs font-bold text-brown-500 uppercase mb-2">Share With Someone New</h4>
                        <form onSubmit={handleShare} className="flex gap-2">
                            <Input
                                placeholder="email@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                type="email"
                                className="flex-1"
                            />
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={!email.trim() || isLoading}
                            >
                                {isLoading ? '...' : 'Share'}
                            </Button>
                        </form>
                        <p className="text-xs text-brown-400 mt-2">
                            They'll receive a notification to accept and merge into their profile.
                        </p>
                    </div>

                    {/* Quick Share with Collaborators */}
                    {collaborators.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-brown-500 uppercase mb-2">Quick Share</h4>
                            <div className="flex flex-wrap gap-2">
                                {collaborators
                                    .filter(c => !shares.find(s => s.sharedWithEmail === c || s.sharedByName === c))
                                    .map(collaborator => (
                                        <button
                                            key={collaborator}
                                            onClick={() => setEmail(collaborator)}
                                            className="px-3 py-1.5 bg-brown-100 text-brown-600 rounded-full text-sm hover:bg-brown-200 transition-colors"
                                        >
                                            + {collaborator}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};

// Pending Shares Inbox Component
interface PendingSharesInboxProps {
    pendingShares: Array<{
        id: string;
        recordType: RecordType;
        recordId: string;
        sourcePersonName: string;
        sharedByName: string;
        recordTitle: string;
        createdAt: Date;
    }>;
    people: Person[];
    onAccept: (shareId: string, mergeIntoPersonId: string | null) => Promise<void>;
    onDecline: (shareId: string) => Promise<void>;
}

export const PendingSharesInbox: React.FC<PendingSharesInboxProps> = ({
    pendingShares,
    people,
    onAccept,
    onDecline
}) => {
    const [activeShare, setActiveShare] = useState<string | null>(null);
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    if (pendingShares.length === 0) return null;

    const handleAccept = async (shareId: string) => {
        setIsLoading(true);
        try {
            await onAccept(shareId, selectedPersonId);
            setActiveShare(null);
            setSelectedPersonId(null);
        } catch (error) {
            console.error('Failed to accept share:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getRecordTypeLabel = (type: RecordType) => {
        switch (type) {
            case RecordType.TODO: return 'task';
            case RecordType.HEALTH: return 'health record';
            case RecordType.NOTE: return 'note';
            case RecordType.FINANCE: return 'financial record';
            default: return 'item';
        }
    };

    return (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6">
            <h3 className="font-bold text-indigo-800 flex items-center gap-2 mb-3">
                <Icon name="inbox" className="text-indigo-500" />
                Shared With You ({pendingShares.length})
            </h3>

            <div className="space-y-3">
                {pendingShares.map(share => (
                    <div key={share.id} className="bg-white rounded-xl p-4 border border-indigo-100">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-brown-800 font-medium">
                                    <span className="text-indigo-600">{share.sharedByName}</span> shared a {getRecordTypeLabel(share.recordType)}
                                </p>
                                <p className="text-sm text-brown-500 mt-1">
                                    "{share.recordTitle}" from their <strong>{share.sourcePersonName}</strong> profile
                                </p>
                            </div>
                        </div>

                        {activeShare === share.id ? (
                            <div className="mt-4 p-3 bg-brown-50 rounded-xl">
                                <p className="text-sm text-brown-600 mb-3">
                                    Which of your profiles should this merge into?
                                </p>
                                <div className="space-y-2 mb-4">
                                    {people.map(p => (
                                        <label
                                            key={p.id}
                                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${selectedPersonId === p.id
                                                    ? 'bg-indigo-100 border-2 border-indigo-300'
                                                    : 'bg-white border border-brown-200 hover:border-indigo-200'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name={`merge-${share.id}`}
                                                checked={selectedPersonId === p.id}
                                                onChange={() => setSelectedPersonId(p.id)}
                                                className="hidden"
                                            />
                                            <div className={`w-8 h-8 rounded-full ${p.themeColor} flex items-center justify-center text-sm font-bold`}>
                                                {p.name[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium text-brown-800">{p.name}</p>
                                                <p className="text-xs text-brown-500">{p.relation}</p>
                                            </div>
                                        </label>
                                    ))}
                                    <label
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${selectedPersonId === null
                                                ? 'bg-indigo-100 border-2 border-indigo-300'
                                                : 'bg-white border border-brown-200 hover:border-indigo-200'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name={`merge-${share.id}`}
                                            checked={selectedPersonId === null}
                                            onChange={() => setSelectedPersonId(null)}
                                            className="hidden"
                                        />
                                        <div className="w-8 h-8 rounded-full bg-brown-100 flex items-center justify-center text-brown-400">
                                            <Icon name="add" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-brown-800">Keep Separate</p>
                                            <p className="text-xs text-brown-500">Don't merge, view in "Shared with me"</p>
                                        </div>
                                    </label>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setActiveShare(null)}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={() => handleAccept(share.id)}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Accepting...' : 'Accept & Merge'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3 flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDecline(share.id)}
                                    className="text-brown-500"
                                >
                                    Decline
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setActiveShare(share.id)}
                                >
                                    Review & Accept
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

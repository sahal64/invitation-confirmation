import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { QRCodeRecord, Language } from '../types';
import {
  fetchQRCodes,
  createQRCode,
  updateQRCode,
  deleteQRCode,
  toggleQRCodeStatus,
  getPermanentQRUrl,
  isSafeHttpUrl,
  slugifyQrId,
} from '../services/qrCodes';
import {
  QrCode,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Check,
  Download,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface QRCodeManagerProps {
  currentLang?: Language;
}

export const QRCodeManager: React.FC<QRCodeManagerProps> = () => {
  const [qrList, setQrList] = useState<QRCodeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state for creating a new QR code
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [creating, setCreating] = useState(false);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Active modal state for viewing/downloading QR image
  const [selectedQR, setSelectedQR] = useState<QRCodeRecord | null>(null);
  const [qrImageDataUrl, setQrImageDataUrl] = useState<string>('');

  // Active modal state for editing a QR mapping
  const [editingQR, setEditingQR] = useState<QRCodeRecord | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Copy URL feedback state (maps qr_id to boolean)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const res = await fetchQRCodes();
    if (res.data) {
      setQrList(res.data);
    }
    if (res.error) {
      console.warn('QR fetch error:', res.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Generate QR code data URL whenever a QR is selected for preview
  useEffect(() => {
    if (selectedQR) {
      const permanentUrl = getPermanentQRUrl(selectedQR.qr_id);
      QRCode.toDataURL(permanentUrl, {
        errorCorrectionLevel: 'H',
        width: 600,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#ffffff',
        },
      })
        .then((url) => setQrImageDataUrl(url))
        .catch((err) => console.error('Error generating QR code:', err));
    } else {
      setQrImageDataUrl('');
    }
  }, [selectedQR]);

  // Handle Create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showFeedback('error', 'Please enter a title for the QR code.');
      return;
    }
    if (!newDestination.trim()) {
      showFeedback('error', 'Please enter a destination URL.');
      return;
    }
    if (!isSafeHttpUrl(newDestination.trim())) {
      showFeedback('error', 'Destination URL must start with http:// or https://');
      return;
    }

    setCreating(true);
    const res = await createQRCode({
      title: newTitle.trim(),
      qr_id: newSlug.trim() || undefined,
      destination_url: newDestination.trim(),
      is_active: true,
    });

    if (res.success && res.data) {
      setQrList((prev) => [res.data!, ...prev.filter((q) => q.id !== res.data!.id)]);
      setNewTitle('');
      setNewSlug('');
      setNewDestination('');
      showFeedback('success', `Permanent QR code "${res.data.title}" created successfully!`);
    } else {
      showFeedback('error', res.error || 'Failed to create QR code.');
    }
    setCreating(false);
  };

  // Handle Copy Permanent URL
  const handleCopyUrl = (qr_id: string) => {
    const permUrl = getPermanentQRUrl(qr_id);
    navigator.clipboard.writeText(permUrl);
    setCopiedSlug(qr_id);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  // Handle Toggle Active
  const handleToggleActive = async (qr: QRCodeRecord) => {
    const updatedStatus = !qr.is_active;
    const res = await toggleQRCodeStatus(qr.id, updatedStatus);
    if (res.success) {
      setQrList((prev) =>
        prev.map((q) => (q.id === qr.id ? { ...q, is_active: updatedStatus } : q))
      );
      showFeedback(
        'success',
        `QR code is now ${updatedStatus ? 'ACTIVE (scans will redirect)' : 'INACTIVE (scans will be blocked)'}.`
      );
    } else {
      showFeedback('error', res.error || 'Failed to update status.');
    }
  };

  // Handle Open Edit
  const handleOpenEdit = (qr: QRCodeRecord) => {
    setEditingQR(qr);
    setEditTitle(qr.title);
    setEditDestination(qr.destination_url);
    setEditActive(qr.is_active);
  };

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQR) return;

    if (!editTitle.trim()) {
      showFeedback('error', 'Title cannot be empty.');
      return;
    }
    if (!editDestination.trim() || !isSafeHttpUrl(editDestination.trim())) {
      showFeedback('error', 'Please enter a valid HTTP or HTTPS destination URL.');
      return;
    }

    setSavingEdit(true);
    const res = await updateQRCode(editingQR.id, {
      title: editTitle.trim(),
      destination_url: editDestination.trim(),
      is_active: editActive,
    });

    if (res.success && res.data) {
      setQrList((prev) => prev.map((q) => (q.id === editingQR.id ? res.data! : q)));
      setEditingQR(null);
      showFeedback(
        'success',
        `Destination URL updated! The printed physical QR code now redirects to "${editDestination.trim()}" without reprinting.`
      );
    } else {
      showFeedback('error', res.error || 'Failed to update QR mapping.');
    }
    setSavingEdit(false);
  };

  // Handle Delete
  const handleDelete = async (qr: QRCodeRecord) => {
    const confirmMsg =
      `Are you sure you want to delete this permanent QR mapping?\n\n` +
      `Title: "${qr.title}"\nPermanent URL: ${getPermanentQRUrl(qr.qr_id)}\n\n` +
      `WARNING: If you have already printed this QR code, scanning it will no longer work.`;

    if (window.confirm(confirmMsg)) {
      const res = await deleteQRCode(qr.id);
      if (res.success) {
        setQrList((prev) => prev.filter((q) => q.id !== qr.id));
        showFeedback('success', `QR mapping "${qr.title}" deleted.`);
      } else {
        showFeedback('error', res.error || 'Failed to delete QR mapping.');
      }
    }
  };

  // Filtered list
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return qrList;
    const q = searchTerm.toLowerCase().trim();
    return qrList.filter(
      (qr) =>
        qr.title.toLowerCase().includes(q) ||
        qr.qr_id.toLowerCase().includes(q) ||
        qr.destination_url.toLowerCase().includes(q)
    );
  }, [qrList, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl flex items-center justify-between text-xs sm:text-sm font-semibold transition-all shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 transition-colors text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Creation Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Create Dynamic Permanent QR Code
            </h2>
            <p className="text-xs text-slate-500">
              One permanent QR code for bulk printing. Update the destination URL at any time without changing the printed QR image.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="mt-4 space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                QR Code Name / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  if (!newSlug) {
                    setNewSlug(slugifyQrId(e.target.value));
                  }
                }}
                placeholder="e.g. UAE's 55th National Day Official RSVP"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                required
              />
            </div>

            {/* Slug / Permanent URL identifier */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Permanent URL Identifier (Slug)
              </label>
              <div className="flex rounded-xl shadow-2xs">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-xs font-mono">
                  /qr/
                </span>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(slugifyQrId(e.target.value))}
                  placeholder="national-day-2026"
                  className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-r-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Permanent link: <span className="font-mono text-emerald-700">{getPermanentQRUrl(newSlug || 'sample-code')}</span>
              </p>
            </div>
          </div>

          {/* Destination URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Destination URL (Where scans should redirect right now) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="url"
                value={newDestination}
                onChange={(e) => setNewDestination(e.target.value)}
                placeholder="https://invitation-confirmation.vercel.app/"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-1">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-xs transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{creating ? 'Creating...' : 'Create Dynamic QR Code'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* QR Codes Table Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        {/* Header & Search */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Active QR Code Mappings
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-bold">
              {filteredList.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search QR codes..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
              />
            </div>

            <button
              onClick={loadData}
              title="Refresh"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Loading dynamic QR codes...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No QR code mappings found.
          </div>
        ) : (
          <div>
            {/* Desktop Table View (≥ 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-28">Status</th>
                    <th className="py-3 px-4 min-w-[220px]">Name & Permanent URL</th>
                    <th className="py-3 px-4 min-w-[240px]">Current Destination (Editable)</th>
                    <th className="py-3 px-4 w-28 text-center">QR Image</th>
                    <th className="py-3 px-4 text-right min-w-[130px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredList.map((qr) => {
                    const isCopied = copiedSlug === qr.qr_id;

                    return (
                      <tr key={qr.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Status Toggle */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(qr)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                              qr.is_active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                            }`}
                            title={qr.is_active ? 'Click to Deactivate' : 'Click to Activate'}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                qr.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            <span>{qr.is_active ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>

                        {/* Title & Permanent QR Link */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">{qr.title}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              /qr/{qr.qr_id}
                            </span>
                            <button
                              onClick={() => handleCopyUrl(qr.qr_id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-1.5 py-0.5 rounded transition-colors"
                              title="Copy Permanent URL"
                            >
                              {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                            </button>
                          </div>
                        </td>

                        {/* Destination URL */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <a
                              href={qr.destination_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-slate-700 hover:text-emerald-700 font-mono truncate max-w-[260px] underline decoration-slate-300 hover:decoration-emerald-500 flex items-center gap-1"
                              title={qr.destination_url}
                            >
                              <span className="truncate">{qr.destination_url}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0 text-slate-400" />
                            </a>
                            <button
                              onClick={() => handleOpenEdit(qr)}
                              className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                              title="Change Destination URL"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* QR Image Preview & Download */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedQR(qr)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-xs border border-slate-200 hover:border-emerald-300 transition-all active:scale-95"
                          >
                            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Preview</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(qr)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(qr)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredList.map((qr) => {
                const isCopied = copiedSlug === qr.qr_id;

                return (
                  <div key={qr.id} className="p-4 space-y-3">
                    {/* Top Status & Preview */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleToggleActive(qr)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          qr.is_active
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            qr.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{qr.is_active ? 'Active' : 'Inactive'}</span>
                      </button>

                      <button
                        onClick={() => setSelectedQR(qr)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200"
                      >
                        <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                        <span>View QR Code</span>
                      </button>
                    </div>

                    {/* Title */}
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{qr.title}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          /qr/{qr.qr_id}
                        </span>
                        <button
                          onClick={() => handleCopyUrl(qr.qr_id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{isCopied ? 'Copied' : 'Copy Permanent URL'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Destination URL */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Current Destination
                      </span>
                      <a
                        href={qr.destination_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-800 font-mono break-all hover:text-emerald-700 flex items-center gap-1"
                      >
                        <span>{qr.destination_url}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0 text-slate-400" />
                      </a>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleOpenEdit(qr)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-emerald-700 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit Destination</span>
                      </button>

                      <button
                        onClick={() => handleDelete(qr)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: QR Code Image Preview & High-Res Download */}
      {selectedQR && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {selectedQR.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedQR(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 text-center space-y-4">
              <div className="inline-block p-4 bg-white rounded-2xl shadow-sm border border-slate-200">
                {qrImageDataUrl ? (
                  <img
                    src={qrImageDataUrl}
                    alt={selectedQR.title}
                    className="w-56 h-56 mx-auto rounded-lg object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Permanent URL info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Encoded Permanent URL
                </span>
                <span className="text-xs font-mono text-emerald-800 break-all block font-semibold">
                  {getPermanentQRUrl(selectedQR.qr_id)}
                </span>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-left text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Permanent Dynamic QR</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Print and distribute this QR code anywhere. When you update the destination URL in this admin dashboard, scanning will instantly redirect to your new destination without reprinting!
                </p>
              </div>

              {/* Download and copy buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <a
                  href={qrImageDataUrl}
                  download={`${selectedQR.qr_id}-qr-code.png`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-xs transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download High-Res PNG</span>
                </a>

                <button
                  onClick={() => handleCopyUrl(selectedQR.qr_id)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold transition-colors"
                >
                  {copiedSlug === selectedQR.qr_id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit QR Mapping */}
      {editingQR && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Edit QR Destination
                </h3>
              </div>
              <button
                onClick={() => setEditingQR(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  QR Code Name / Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Permanent QR Identifier (Slug)
                </label>
                <input
                  type="text"
                  value={editingQR.qr_id}
                  disabled
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-mono cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Permanent identifier cannot be changed so existing printed materials keep working.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  value={editDestination}
                  onChange={(e) => setEditDestination(e.target.value)}
                  placeholder="https://invitation-confirmation.vercel.app/"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  required
                />
                <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                  When saved, any scan of the printed QR code will immediately redirect here.
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Redirect Status
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {editActive ? 'Active — Scans will redirect' : 'Inactive — Scans will be paused'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditActive(!editActive)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    editActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {editActive ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingQR(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingEdit ? 'Saving...' : 'Save & Update QR'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

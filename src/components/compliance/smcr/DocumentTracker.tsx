"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { usePermissionSet } from "@/lib/usePermission";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLOURS,
  type SMCRDocument,
  type DocumentStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/utils";
import {
  FileText,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

export default function DocumentTracker() {
  const smcrDocuments = useAppStore((s) => s.smcrDocuments);
  const users = useAppStore((s) => s.users);
  const updateSmcrDocument = useAppStore((s) => s.updateSmcrDocument);
  const permissionSet = usePermissionSet();
  const canManage = permissionSet.has("manage:smcr");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<DocumentStatus>("DOC_CURRENT");
  const [editOwnerId, setEditOwnerId] = useState("");
  const [editNextUpdate, setEditNextUpdate] = useState("");

  const getOwnerName = (doc: SMCRDocument): string | null => {
    if (doc.owner) return doc.owner.name;
    if (doc.ownerId) {
      const user = users.find((u) => u.id === doc.ownerId);
      return user?.name ?? null;
    }
    return null;
  };

  const startEdit = (doc: SMCRDocument) => {
    setEditingId(doc.id);
    setEditStatus(doc.status);
    setEditOwnerId(doc.ownerId ?? "");
    setEditNextUpdate(doc.nextUpdateDue?.slice(0, 10) ?? "");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = (docId: string) => {
    updateSmcrDocument(docId, {
      status: editStatus,
      ownerId: editOwnerId || null,
      nextUpdateDue: editNextUpdate || null,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Doc ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Owner</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Last Updated</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Next Update Due</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Link</th>
                {canManage && (
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider w-28">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {smcrDocuments.map((doc) => {
                const statusColours = DOCUMENT_STATUS_COLOURS[doc.status];
                const ownerName = getOwnerName(doc);
                const isEditing = editingId === doc.id;

                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-updraft-deep">{doc.docId}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs">
                      <p className="font-medium text-updraft-deep truncate">{doc.title}</p>
                      {doc.description && (
                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{doc.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", statusColours.bg, statusColours.text)}>
                        {DOCUMENT_STATUS_LABELS[doc.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ownerName ?? <span className="text-gray-300">--</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {doc.lastUpdatedAt ? formatDateShort(doc.lastUpdatedAt) : <span className="text-gray-300">--</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {doc.nextUpdateDue ? (
                        <span className={cn(
                          new Date(doc.nextUpdateDue) < new Date() ? "text-red-600 font-medium" : "text-gray-600",
                        )}>
                          {formatDateShort(doc.nextUpdateDue)}
                        </span>
                      ) : (
                        <span className="text-gray-300">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {doc.storageUrl ? (
                        <a
                          href={doc.storageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-updraft-bright-purple hover:underline"
                        >
                          <ExternalLink size={12} /> View
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">--</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="relative">
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value as DocumentStatus)}
                                className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 pr-6 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-updraft-light-purple"
                              >
                                {(Object.entries(DOCUMENT_STATUS_LABELS) as [DocumentStatus, string][]).map(([val, label]) => (
                                  <option key={val} value={val}>{label}</option>
                                ))}
                              </select>
                              <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                            <div className="relative">
                              <select
                                value={editOwnerId}
                                onChange={(e) => setEditOwnerId(e.target.value)}
                                className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 pr-6 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-updraft-light-purple"
                              >
                                <option value="">-- No Owner --</option>
                                {users.filter((u) => u.isActive).map((u) => (
                                  <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                              </select>
                              <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                            <input
                              type="date"
                              value={editNextUpdate}
                              onChange={(e) => setEditNextUpdate(e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-updraft-light-purple"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveEdit(doc.id)}
                                className="flex-1 text-[10px] font-medium text-white bg-updraft-bright-purple hover:bg-updraft-bar rounded px-2 py-1 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="flex-1 text-[10px] font-medium text-gray-500 hover:text-gray-700 bg-gray-100 rounded px-2 py-1"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(doc)}
                            className="text-xs text-updraft-bright-purple hover:underline"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {smcrDocuments.length === 0 && (
          <div className="p-12 text-center">
            <FileText size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">No SM&amp;CR documents configured yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

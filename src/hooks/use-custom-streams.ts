/**
 * State and persistence for custom data streams (definitions + data).
 * Separate from provider/market/eval/payments; used by Import Custom Data card and Data browser.
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  CustomStreamDefinition,
  CustomStreamRow,
  CustomStreamUploadResult,
} from '../types/custom-stream';
import type { CustomStreamData } from '../lib/custom-stream-storage';
import {
  ASI_CLEAR_ALL_APP_DATA_EVENT,
  loadCustomStreamDefinitions,
  saveCustomStreamDefinitions,
  loadCustomStreamData,
  saveCustomStreamData,
  saveCustomStreamDataForStream,
  removeCustomStreamDataForStream,
} from '../lib/custom-stream-storage';

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'stream';
}

export function useCustomStreams() {
  const [definitions, setDefinitions] = useState<CustomStreamDefinition[]>([]);
  const [streamData, setStreamData] = useState<Record<string, CustomStreamData>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDefinitions(loadCustomStreamDefinitions());
    setStreamData(loadCustomStreamData());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveCustomStreamDefinitions(definitions);
  }, [definitions, loaded]);

  useEffect(() => {
    if (loaded) saveCustomStreamData(streamData);
  }, [streamData, loaded]);

  useEffect(() => {
    const onClear = () => {
      setDefinitions([]);
      setStreamData({});
    };
    window.addEventListener(ASI_CLEAR_ALL_APP_DATA_EVENT, onClear);
    return () => window.removeEventListener(ASI_CLEAR_ALL_APP_DATA_EVENT, onClear);
  }, []);

  const addStream = useCallback(
    (label: string, linkType: 'provider' | 'standalone', keyColumn?: string) => {
      const id = slugify(label) || `stream-${Date.now()}`;
      const existingIds = new Set(definitions.map((d) => d.id));
      let finalId = id;
      let suffix = 0;
      while (existingIds.has(finalId)) {
        suffix++;
        finalId = `${id}-${suffix}`;
      }
      const def: CustomStreamDefinition = {
        id: finalId,
        label: label.trim() || finalId,
        linkType,
        keyColumn: linkType === 'standalone' ? keyColumn ?? 'Key' : undefined,
      };
      setDefinitions((prev) => [...prev, def]);
      return finalId;
    },
    [definitions]
  );

  const updateStream = useCallback((streamId: string, updates: Partial<Pick<CustomStreamDefinition, 'label' | 'keyColumn'>>) => {
    setDefinitions((prev) =>
      prev.map((d) => (d.id === streamId ? { ...d, ...updates } : d))
    );
  }, []);

  const removeStream = useCallback((streamId: string) => {
    setDefinitions((prev) => prev.filter((d) => d.id !== streamId));
    setStreamData((prev) => {
      const next = { ...prev };
      delete next[streamId];
      return next;
    });
    removeCustomStreamDataForStream(streamId);
  }, []);

  const getStreamData = useCallback(
    (streamId: string): CustomStreamData | null => {
      return streamData[streamId] ?? null;
    },
    [streamData]
  );

  const replaceStreamDataFromUpload = useCallback(
    (streamId: string, result: CustomStreamUploadResult, mode: 'replace' | 'add') => {
      const existing = streamData[streamId];
      const newData: CustomStreamData = {
        mapping: result.mapping,
        columnOrder: result.columnOrder,
        rows: result.rows,
      };
      if (mode === 'add' && existing && existing.rows.length > 0) {
        const def = definitions.find((d) => d.id === streamId);
        const linkKey = def?.linkType === 'provider' ? 'Employee_ID' : (def?.keyColumn ?? 'Key');
        const existingKeys = new Set(existing.rows.map((r) => String(r[linkKey] ?? '').trim()));
        const toAdd = result.rows.filter((r) => !existingKeys.has(String(r[linkKey] ?? '').trim()));
        newData.rows = [...existing.rows, ...toAdd];
        newData.columnOrder = result.columnOrder.length ? result.columnOrder : existing.columnOrder;
        newData.mapping = { ...existing.mapping, ...result.mapping };
      }
      setStreamData((prev) => ({ ...prev, [streamId]: newData }));
      saveCustomStreamDataForStream(streamId, newData);
    },
    [streamData, definitions]
  );

  const clearStreamData = useCallback((streamId: string) => {
    setStreamData((prev) => {
      const next = { ...prev };
      delete next[streamId];
      return next;
    });
    removeCustomStreamDataForStream(streamId);
  }, []);

  const getRowCount = useCallback(
    (streamId: string): number => {
      const data = streamData[streamId];
      return data?.rows?.length ?? 0;
    },
    [streamData]
  );

  /** Build lookup for provider-linked stream: providerKey -> row (for export join). */
  const buildProviderLookup = useCallback(
    (streamId: string): ((providerKey: string) => CustomStreamRow | undefined) => {
      const data = streamData[streamId];
      const def = definitions.find((d) => d.id === streamId);
      if (!data?.rows?.length || def?.linkType !== 'provider') return () => undefined;
      const linkKey = 'Employee_ID';
      const byKey = new Map<string, CustomStreamRow>();
      for (const row of data.rows) {
        const keyVal = row[linkKey];
        const key = keyVal !== undefined && keyVal !== null && keyVal !== '' ? String(keyVal).trim() : '';
        if (key) byKey.set(key, row);
      }
      return (providerKey: string) => byKey.get(providerKey.trim());
    },
    [streamData, definitions]
  );

  return {
    definitions,
    streamData,
    loaded,
    addStream,
    updateStream,
    removeStream,
    getStreamData,
    replaceStreamDataFromUpload,
    clearStreamData,
    getRowCount,
    buildProviderLookup,
  };
}

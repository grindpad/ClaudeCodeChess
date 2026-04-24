import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useChessStore } from '../../store';
import { serializePgn } from '../../pgn/pgnSerializer';
import { saveEntry, updateGame, getEntry } from '../../storage/gameStorage';
import type { StoredGameRecord } from '../../storage/storageTypes';

export default function SaveGameModal() {
  const visible = useChessStore((s) => s.saveGameModalVisible);
  const closeSaveGameModal = useChessStore((s) => s.closeSaveGameModal);
  const moveTree = useChessStore((s) => s.moveTree);
  const metadata = useChessStore((s) => s.metadata);
  const activeLibraryEntryId = useChessStore((s) => s.activeLibraryEntryId);
  const activeGameId = useChessStore((s) => s.activeGameId);
  const setActiveLibraryGame = useChessStore((s) => s.setActiveLibraryGame);

  const [white, setWhite] = useState('');
  const [black, setBlack] = useState('');
  const [event, setEvent] = useState('');
  const [date, setDate] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (visible) {
      setSaved(false);
      setWhite(metadata?.white ?? '');
      setBlack(metadata?.black ?? '');
      setEvent(metadata?.event ?? '');
      setDate(metadata?.date ?? '');
    }
  }, [visible, metadata]);

  const handleSave = () => {
    if (!moveTree) return;

    const enrichedMetadata = {
      ...(metadata ?? {}),
      white: white.trim() || null,
      black: black.trim() || null,
      event: event.trim() || null,
      date: date.trim() || null,
    };

    const pgn = serializePgn(moveTree, enrichedMetadata as any);

    if (activeLibraryEntryId && activeGameId) {
      // Update existing entry's game
      updateGame(activeLibraryEntryId, activeGameId, pgn);
      // Refresh active state (entry unchanged)
      setActiveLibraryGame(activeLibraryEntryId, activeGameId);
    } else {
      // Create a new LibraryEntry
      const gameId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const title = enrichedMetadata.event
        ? enrichedMetadata.event
        : `${enrichedMetadata.white ?? '?'} vs ${enrichedMetadata.black ?? '?'}`;

      const gameRecord: StoredGameRecord = {
        id: gameId,
        entryId: '', // will be filled in by saveEntry
        pgn,
        white: enrichedMetadata.white,
        black: enrichedMetadata.black,
        event: enrichedMetadata.event ?? null,
        date: enrichedMetadata.date ?? null,
        result: (enrichedMetadata as any).result ?? null,
        plyCount: moveTree.mainLine.length > 0
          ? moveTree.mainLine[moveTree.mainLine.length - 1].ply
          : null,
        hasAnnotations: moveTree.mainLine.some((n) => n.comment || n.nags.length > 0 || n.variations.length > 0),
        indexInEntry: 0,
      };

      const entryId = saveEntry({
        title,
        source: 'played',
        games: [gameRecord],
      });

      setActiveLibraryGame(entryId, gameId);
    }

    setSaved(true);
    setTimeout(() => {
      closeSaveGameModal();
      setSaved(false);
    }, 800);
  };

  const handleClose = () => {
    closeSaveGameModal();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Save Game</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
            <Field label="White" value={white} onChange={setWhite} placeholder="White player" />
            <Field label="Black" value={black} onChange={setBlack} placeholder="Black player" />
            <Field label="Event" value={event} onChange={setEvent} placeholder="Event name" />
            <Field label="Date" value={date} onChange={setDate} placeholder="YYYY.MM.DD" />
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, !moveTree && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!moveTree}
            >
              <Text style={styles.saveText}>{saved ? '✓ Saved' : 'Save to Library'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#444"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1C1C1C',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#F0F0F0',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    color: '#888',
    fontSize: 18,
    padding: 4,
  },
  scroll: {
    maxHeight: 300,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#111111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#C8C8C8',
    fontSize: 15,
    minHeight: 44,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#2E2E2E',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#3A3A3A',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveText: {
    color: '#F0F0F0',
    fontSize: 15,
    fontWeight: '700',
  },
});

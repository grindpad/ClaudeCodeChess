import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useChessStore } from '../../store';
import { parseMultiPgn } from '../../pgn/pgnParser';

export default function PgnImportModal() {
  const router = useRouter();
  const visible = useChessStore((s) => s.pgnImportModalVisible);
  const closePgnImport = useChessStore((s) => s.closePgnImport);
  const loadPgn = useChessStore((s) => s.loadPgn);
  const setPendingImportGames = useChessStore((s) => s.setPendingImportGames);

  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const handleImport = () => {
    if (!text.trim()) return;

    const { games, parseErrors } = parseMultiPgn(text.trim());

    if (games.length === 0) {
      setError(parseErrors.length > 0
        ? `No valid games found. ${parseErrors[0]}`
        : 'No valid games found in this PGN.');
      return;
    }

    const warn = parseErrors.length > 0
      ? `${parseErrors.length} game${parseErrors.length !== 1 ? 's' : ''} could not be parsed`
      : null;

    if (games.length === 1) {
      loadPgn(games[0].pgn);
      setError(null);
      setWarning(null);
      setText('');
      closePgnImport();
    } else {
      setPendingImportGames(games);
      setError(null);
      setWarning(null);
      setText('');
      closePgnImport();
      router.push({
        pathname: '/import-select',
        params: { errorCount: String(parseErrors.length), firstError: parseErrors[0] ?? '' },
      });
    }
    if (warn) setWarning(warn);
  };

  const handleClose = () => {
    setError(null);
    closePgnImport();
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
            <Text style={styles.title}>Import PGN</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Paste PGN below</Text>
          <ScrollView style={styles.inputScroll} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              multiline
              value={text}
              onChangeText={setText}
              placeholder={'[Event "..."]\n[White "..."]\n[Black "..."]\n\n1. e4 e5 2. Nf3 ...'}
              placeholderTextColor="#555"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />
          </ScrollView>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {warning && !error ? <Text style={styles.warningText}>{warning}</Text> : null}

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.importBtn, !text.trim() && styles.importBtnDisabled]}
              onPress={handleImport}
              disabled={!text.trim()}
            >
              <Text style={styles.importText}>Import</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    marginBottom: 16,
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
  label: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
  },
  inputScroll: {
    maxHeight: 280,
  },
  input: {
    backgroundColor: '#111111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    padding: 12,
    color: '#C8C8C8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    minHeight: 160,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#E84855',
    fontSize: 13,
    marginTop: 8,
  },
  warningText: {
    color: '#D4A017',
    fontSize: 13,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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
  importBtn: {
    flex: 2,
    backgroundColor: '#3A3A3A',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  importBtnDisabled: {
    opacity: 0.4,
  },
  importText: {
    color: '#F0F0F0',
    fontSize: 15,
    fontWeight: '700',
  },
});

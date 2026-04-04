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
import { useChessStore } from '../../store';

export default function PgnImportModal() {
  const visible = useChessStore((s) => s.pgnImportModalVisible);
  const closePgnImport = useChessStore((s) => s.closePgnImport);
  const loadPgn = useChessStore((s) => s.loadPgn);

  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    if (!text.trim()) return;
    try {
      loadPgn(text.trim());
      setError(null);
      setText('');
      closePgnImport();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid PGN');
    }
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
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />
          </ScrollView>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
    backgroundColor: '#1e1e3f',
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
    color: '#e0e0ff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    color: '#888',
    fontSize: 18,
    padding: 4,
  },
  label: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 8,
  },
  inputScroll: {
    maxHeight: 300,
  },
  input: {
    backgroundColor: '#0d0d1e',
    borderRadius: 8,
    padding: 12,
    color: '#e0e0ff',
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
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#2d2d4e',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '600',
  },
  importBtn: {
    flex: 2,
    backgroundColor: '#5c6bc0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  importBtnDisabled: {
    opacity: 0.4,
  },
  importText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
